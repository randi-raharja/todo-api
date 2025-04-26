// Ip public
export const getClientIP = async (): Promise<string> => {
    try {
        const ipApi = await fetch("https://api64.ipify.org?format=json");
        const clientIP = await ipApi.json();
        return clientIP.ip;
    } catch (error) {
        return "unknown";
    }
};

// Deteksi perangkat berdasarkan User-Agent
export const getDeviceType = (userAgent: string): string => {
    if (/mobile/i.test(userAgent)) {
        return "smartphone";
    } else if (/tablet/i.test(userAgent)) {
        return "tablet";
    } else {
        return "pc";
    }
};

// Geolocation
interface GeoLocation {
    regionName?: string;
    country?: string;
    error?: object | string | any; // Optional error property
}
export const getGeoLocation = async (ip: string): Promise<GeoLocation> => {
    try {
        const response = await fetch(`http://ip-api.com/json/${ip}`);
        return await response.json();
    } catch (error) {
        return { error: "Unable to fetch geolocation" };
    }
};
