const http = require('http');
const https = require('https');
const net = require('net');
const productRepo = require('../data/repositories/productRepository');

exports.search = (q) => productRepo.filterProducts(q);

function isForbiddenHost(hostname) {
    if (!hostname) return true;
    const cleanHost = hostname.replace(/^\[|\]$/g, '').toLowerCase();

    if (cleanHost === 'localhost' || cleanHost === '0.0.0.0' || cleanHost.includes('internal-network') ||
        cleanHost.endsWith('.local') || cleanHost.endsWith('.internal') || cleanHost.endsWith('.localhost')) {
        return true;
    }

    const ipType = net.isIP(cleanHost);
    if (ipType === 4) {
        const parts = cleanHost.split('.').map(Number);
        if (parts[0] === 0 || parts[0] === 10 || parts[0] === 127) return true;
        if (parts[0] === 169 && parts[1] === 254) return true;
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
        if (parts[0] === 192 && parts[1] === 168) return true;
        if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
        if (parts[0] === 192 && parts[1] === 0 && (parts[2] === 0 || parts[2] === 2)) return true;
        if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) return true;
        if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) return true;
        if (parts[0] >= 224) return true;
    } else if (ipType === 6) {
        if (cleanHost === '::1' || cleanHost === '::') return true;
        if (cleanHost.startsWith('::ffff:')) {
            const mapped = cleanHost.substring(7);
            if (net.isIP(mapped) === 4) {
                return isForbiddenHost(mapped);
            }
            const hexParts = mapped.split(':');
            if (hexParts.length === 2) {
                const num1 = parseInt(hexParts[0], 16);
                const num2 = parseInt(hexParts[1], 16);
                if (!isNaN(num1) && !isNaN(num2)) {
                    const ip4 = `${(num1 >> 8) & 255}.${num1 & 255}.${(num2 >> 8) & 255}.${num2 & 255}`;
                    return isForbiddenHost(ip4);
                }
            }
            return true;
        }
        if (cleanHost.startsWith('fe80:') || /^fe[89ab]/i.test(cleanHost)) return true;
        if (cleanHost.startsWith('fc') || cleanHost.startsWith('fd')) return true;
    }

    return false;
}

exports.fetchRemoteAsset = (target, cb) => {
    let parsedUrl;
    try {
        const urlStr = typeof target === 'string' ? target : (target && target.url ? target.url : (target ? String(target) : ''));
        if (!urlStr) {
            return cb(new Error("Forbidden access rule triggered."));
        }
        parsedUrl = new URL(urlStr);
    } catch (e) {
        return cb(new Error("Forbidden access rule triggered."));
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return cb(new Error("Forbidden access rule triggered."));
    }

    if (isForbiddenHost(parsedUrl.hostname)) {
        return cb(new Error("Forbidden access rule triggered."));
    }

    const client = parsedUrl.protocol === 'https:' ? https : http;
    client.get(parsedUrl, (proxyRes) => {
        let body = '';
        proxyRes.on('data', chunk => body += chunk);
        proxyRes.on('end', () => cb(null, body.substring(0, 50)));
    }).on('error', err => cb(err));
};
