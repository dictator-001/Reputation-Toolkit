(function initVendorDefaults(globalScope) {
  const TYPES = [
    { id: "ip", label: "IP" },
    { id: "domain", label: "Domain" },
    { id: "hash", label: "Hash" },
    { id: "url", label: "URL" }
  ];

  const DEFAULT_VENDORS = [
    {
      id: "abuseipdb",
      name: "AbuseIPDB",
      types: ["ip"],
      urlTemplate: "https://www.abuseipdb.com/check/{value}",
      enabled: true
    },
    {
      id: "alienvault-otx-ip",
      name: "AlienVault OTX",
      types: ["ip"],
      urlTemplate: "https://otx.alienvault.com/indicator/ip/{value}",
      enabled: true
    },
    {
      id: "alienvault-otx-domain",
      name: "AlienVault OTX",
      types: ["domain"],
      urlTemplate: "https://otx.alienvault.com/indicator/domain/{value}",
      enabled: true
    },
    {
      id: "alienvault-otx-file",
      name: "AlienVault OTX",
      types: ["hash"],
      urlTemplate: "https://otx.alienvault.com/indicator/file/{value}",
      enabled: true
    },
    {
      id: "arin",
      name: "ARIN",
      types: ["ip"],
      urlTemplate: "https://search.arin.net/rdap/?query={value}",
      enabled: true
    },
    {
      id: "censys-hosts",
      name: "Censys",
      types: ["ip", "domain"],
      urlTemplate: "https://search.censys.io/search?resource=hosts&q={value}",
      enabled: true
    },
    {
      id: "fortiguard-search",
      name: "FortiGuard",
      types: ["ip", "domain", "url"],
      urlTemplate: "https://www.fortiguard.com/search?q={value}",
      enabled: true
    },
    {
      id: "greynoise",
      name: "GreyNoise",
      types: ["ip"],
      urlTemplate: "https://viz.greynoise.io/ip/{value}",
      enabled: true
    },
    {
      id: "ipinfo",
      name: "IPinfo",
      types: ["ip"],
      urlTemplate: "https://ipinfo.io/{value}",
      enabled: true
    },
    {
      id: "ipqualityscore",
      name: "IPQualityScore",
      types: ["ip", "domain", "url"],
      urlTemplate: "https://www.ipqualityscore.com/threat-feeds/malicious-url-scanner/{value}",
      enabled: true
    },
    {
      id: "ipvoid",
      name: "IPVoid",
      types: ["ip"],
      urlTemplate: "https://www.ipvoid.com/ip-blacklist-check/?ip={value}",
      enabled: true
    },
    {
      id: "mxtoolbox-blacklist",
      name: "MXToolbox",
      types: ["ip"],
      urlTemplate: "https://mxtoolbox.com/SuperTool.aspx?action=blacklist%3a{value}&run=toolpage",
      enabled: true
    },
    {
      id: "mxtoolbox-domain",
      name: "MXToolbox",
      types: ["domain"],
      urlTemplate: "https://mxtoolbox.com/SuperTool.aspx?action=a%3a{value}&run=toolpage",
      enabled: true
    },
    {
      id: "pulsedive",
      name: "Pulsedive",
      types: ["ip", "domain", "hash", "url"],
      urlTemplate: "https://pulsedive.com/indicator/?ioc={value}",
      enabled: true
    },
    {
      id: "scamalytics",
      name: "Scamalytics",
      types: ["ip"],
      urlTemplate: "https://scamalytics.com/ip/{value}",
      enabled: true
    },
    {
      id: "securitytrails-domain",
      name: "SecurityTrails",
      types: ["domain"],
      urlTemplate: "https://securitytrails.com/domain/{value}/dns",
      enabled: true
    },
    {
      id: "securitytrails-ip",
      name: "SecurityTrails",
      types: ["ip"],
      urlTemplate: "https://securitytrails.com/list/ip/{value}",
      enabled: true
    },
    {
      id: "shodan-host",
      name: "Shodan",
      types: ["ip"],
      urlTemplate: "https://www.shodan.io/host/{value}",
      enabled: true
    },
    {
      id: "shodan-search",
      name: "Shodan",
      types: ["domain"],
      urlTemplate: "https://www.shodan.io/search?query=hostname:{value}",
      enabled: true
    },
    {
      id: "talos",
      name: "Talos",
      types: ["ip", "domain", "url"],
      urlTemplate: "https://talosintelligence.com/reputation_center/lookup?search={value}",
      enabled: true
    },
    {
      id: "threatminer-host",
      name: "ThreatMiner",
      types: ["ip", "domain"],
      urlTemplate: "https://www.threatminer.org/host.php?q={value}",
      enabled: true
    },
    {
      id: "threatminer-sample",
      name: "ThreatMiner",
      types: ["hash"],
      urlTemplate: "https://www.threatminer.org/sample.php?q={value}",
      enabled: true
    },
    {
      id: "tor-relay-search",
      name: "TOR Relay",
      types: ["ip"],
      urlTemplate: "https://metrics.torproject.org/rs.html#search/{value}",
      enabled: true
    },
    {
      id: "urlhaus",
      name: "URLhaus",
      types: ["domain", "url"],
      urlTemplate: "https://urlhaus.abuse.ch/browse.php?search={value}",
      enabled: true
    },
    {
      id: "urlscan",
      name: "urlscan.io",
      types: ["domain", "url"],
      urlTemplate: "https://urlscan.io/search/#{value}",
      enabled: true
    },
    {
      id: "virustotal-search",
      name: "VirusTotal Search",
      types: ["url"],
      urlTemplate: "https://www.virustotal.com/gui/search/{value}",
      enabled: true
    },
    {
      id: "virustotal-ip",
      name: "VirusTotal",
      types: ["ip"],
      urlTemplate: "https://www.virustotal.com/gui/ip-address/{value}",
      enabled: true
    },
    {
      id: "virustotal-domain",
      name: "VirusTotal",
      types: ["domain"],
      urlTemplate: "https://www.virustotal.com/gui/domain/{value}",
      enabled: true
    },
    {
      id: "virustotal-file",
      name: "VirusTotal",
      types: ["hash"],
      urlTemplate: "https://www.virustotal.com/gui/file/{value}",
      enabled: true
    },
    {
      id: "xforce-ip",
      name: "IBM X-Force",
      types: ["ip"],
      urlTemplate: "https://exchange.xforce.ibmcloud.com/ip/{value}",
      enabled: true
    },
    {
      id: "xforce-url",
      name: "IBM X-Force",
      types: ["domain", "url"],
      urlTemplate: "https://exchange.xforce.ibmcloud.com/url/{value}",
      enabled: true
    },
    {
      id: "hybrid-analysis",
      name: "Hybrid Analysis",
      types: ["hash"],
      urlTemplate: "https://www.hybrid-analysis.com/search?query={value}",
      enabled: true
    },
    {
      id: "malwarebazaar",
      name: "MalwareBazaar",
      types: ["hash"],
      urlTemplate: "https://bazaar.abuse.ch/browse.php?search={value}",
      enabled: true
    },
    {
      id: "metadefender",
      name: "MetaDefender",
      types: ["hash"],
      urlTemplate: "https://metadefender.opswat.com/results/hash/{value}",
      enabled: true
    },
    {
      id: "phishtank",
      name: "PhishTank",
      types: ["url"],
      urlTemplate: "https://phishtank.org/phish_search.php?valid=y&Search={value}",
      enabled: true
    },
    {
      id: "sucuri",
      name: "Sucuri SiteCheck",
      types: ["domain", "url"],
      urlTemplate: "https://sitecheck.sucuri.net/results/{value}",
      enabled: true
    }
  ];

  globalScope.VendorDefaults = {
    storageKey: "reputationToolkitVendors",
    versionKey: "reputationToolkitVendorVersion",
    version: 1,
    types: TYPES,
    vendors: DEFAULT_VENDORS
  };
})(globalThis);
