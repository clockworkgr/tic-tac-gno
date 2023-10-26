export const cleanUpRealmReturn = (ret: string) => {
    return ret.slice(2, -9).replace(/\\"/g, '"');
};
export const decodeRealmResponse = (resp: string) => {
    return cleanUpRealmReturn(atob(resp));
};
export const parsedJSONOrRaw = (data: string, nob64 = false) => {
    const decoded = nob64 ? cleanUpRealmReturn(data) : decodeRealmResponse(data);
    try {
        return JSON.parse(decoded);
    } catch(e) {
        return decoded;
    }
};
