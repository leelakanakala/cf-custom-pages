async function getDeviceInfo(identityData, deviceId, apiDeviceData) {
  try {
    if (identityData.error) {
      throw new Error(identityData.error);
    }

    // Get device info from identity data (device_sessions array)
    const device = identityData.device_sessions?.[0]?.device || {};
    
    // Prioritize API device data if available (from Cloudflare API)
    // API response structure: { result: { id, name, model, os_version, serial_number } }
    const apiDevice = apiDeviceData?.result || {};

    const result = {
      deviceId: deviceId || apiDevice.id || device.id || "N/A",
      deviceName: apiDevice.name || device.name || "N/A",
      deviceModel: apiDevice.model || device.model || "N/A",
      deviceOsVersion: apiDevice.os_version || device.os_version || "N/A",
      deviceSerial: apiDevice.serial_number || device.serial_number || device.serial || "N/A"
    };
    
    return result;
  } catch (error) {
    throw error;
  }
}
