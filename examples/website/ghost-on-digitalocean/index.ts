import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";
import * as cloudflare from "@pulumi/cloudflare";
import * as mailgun from "@pulumi/mailgun";
import * as random from "@pulumi/random";
import * as fs from "fs";

// Import the configuration settings.
const config = new pulumi.Config();
const hostname = config.require("hostname");
const cloudflareDomain = config.require("cloudflareDomain");
const dropletImage = config.require("dropletImage");
const dropletSize = config.require("dropletSize");
const sshPublicKeyPath = config.require("sshPublicKeyPath");

// Set a few local variables.
const digitalOceanDomainName = hostname ? `${hostname}.${cloudflareDomain}` : cloudflareDomain;
const digitalOceanDNSRecordName = hostname
    ? pulumi.interpolate`${hostname}.${cloudflareDomain}`
    : "@";
const cloudflareDNSRecordNameForDroplet = hostname || "@";

// Upload the SSH public key to DigitalOcean.
const sshKey = new digitalocean.SshKey("ssh-key", {
    publicKey: fs.readFileSync(sshPublicKeyPath).toString("utf-8"),
});

// Provision a droplet using the specified SSH key.
const droplet = new digitalocean.Droplet("digitalocean-droplet", {
    image: dropletImage,
    size: dropletSize,
    backups: true,
    sshKeys: [sshKey.fingerprint],
});

// Provision a DigitalOcean domain.
const domain = new digitalocean.Domain("digitalocean-domain", {
    name: digitalOceanDomainName,
});

// Provision a DigitalOcean DNS record for the droplet.
const record = new digitalocean.DnsRecord("digitalocean-dns-record", {
    domain: domain.name,
    name: digitalOceanDNSRecordName,
    value: droplet.ipv4Address,
    type: "A",
});

// Generate a random password to be used for the SMTP server.
const smtpPassword = new random.RandomPassword("smtp-password", {
    length: 16,
    special: true,
}).result;

// Provision a Mailgun domain.
const mailgunDomain = new mailgun.Domain("mailgun-domain", {
    name: `mail-${pulumi.getStack()}.${cloudflareDomain}`,
    region: "us",
    dkimKeySize: 1024,
    smtpPassword: smtpPassword,
    spamAction: "disabled",
});

// Look up the target Cloudflare domain.
const dnsZone = cloudflare.getZoneOutput({
    name: cloudflareDomain,
});

// Provision a CloudFlare DNS record for the droplet.
const dnsRecord = new cloudflare.Record("dns-record", {
    zoneId: dnsZone.zoneId,
    type: "A",
    name: cloudflareDNSRecordNameForDroplet,
    value: droplet.ipv4Address,
    ttl: 3600,
    proxied: false,
});

// Provision a TXT verification record for each "sending" recordset.
mailgunDomain.sendingRecordsSets.apply(records => {
    records.forEach((record, i) => {
        if (record.recordType === "TXT") {
            new cloudflare.Record(`txt-record-${i}`, {
                name: record.name,
                zoneId: dnsZone.zoneId,
                type: record.recordType,
                value: record.value,
                ttl: 3600,
            });
        }
    });
});

// Provision a CloudFlare MX record for each "receiving" recordset.
mailgunDomain.receivingRecordsSets.apply(records => {
    records.forEach((record, i) => {
        if (record.recordType === "MX") {
            new cloudflare.Record(`mx-record-${i}`, {
                name: `mailgun.${cloudflareDomain}`,
                zoneId: dnsZone.zoneId,
                type: record.recordType,
                value: record.value,
                priority: parseInt(record.priority),
            });
        }
    });
});

// Export all of the generated goodies.
export const ipv4Address = droplet.ipv4Address;
export const url = pulumi.interpolate`https://${dnsRecord.hostname}/ghost`;
export const mailConfig = pulumi.jsonStringify({
    mail: {
        transport: "SMTP",
        options: {
            service: "Mailgun",
            auth: {
                user: mailgunDomain.smtpLogin,
                pass: mailgunDomain.smtpPassword,
            },
        },
    },
});
