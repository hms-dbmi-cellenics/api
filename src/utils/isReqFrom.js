const dns = require('dns').promises;
const ipaddr = require('ipaddr.js');

// eslint-disable-next-line no-useless-escape
const INTERNAL_DOMAINS_REGEX = new RegExp('((\.compute\.internal)|(\.svc\.local))$');

const isReqFromLocalhost = async (req) => {
  console.log('isReqFromLocalhost');
  const ip = req.connection.remoteAddress;
  const host = req.get('host');

  console.log('isReqFromLocalhost ip, host: ', ip, host);
  if (ip === '127.0.0.1' || ip === '::ffff:127.0.0.1' || ip === '::1' || host.indexOf('localhost') !== -1) {
    console.log('isReqFromLocalhost return true');
    return true;
  }

  console.log('isReqFromLocalhost throwing error');
  throw new Error('ip address is not localhost');
};

const isReqFromCluster = async (req) => {
  console.log('isReqFromCluster ', req.ip);

  let remoteAddress = req.ip;
  const addr = ipaddr.parse(req.ip);
  // req.ip returns IPv4 addresses mapped to IPv6, e.g.:
  // 127.0.0.1 (IPv4) -> ::ffff:127.0.0.1 (IPv6)
  // dns.reverse is not capable of dealing with them,
  // it either uses IPv4 or IPv6, so we need to map those
  // IPs back to IPv4 before.
  if (addr.kind() === 'ipv6' && addr.isIPv4MappedAddress()) {
    remoteAddress = addr.toIPv4Address().toString();
  }

  const domains = await dns.reverse(remoteAddress);

  console.log('isReqFromCluster domains ', domains);
  if (domains.some((domain) => INTERNAL_DOMAINS_REGEX.test(domain))) {
    console.log('isReqFromCluster returning true');
    return true;
  }

  console.log('isReqFromCluster throwing error');
  throw new Error('ip address does not come from internal sources');
};

module.exports = {
  isReqFromCluster,
  isReqFromLocalhost,
};
