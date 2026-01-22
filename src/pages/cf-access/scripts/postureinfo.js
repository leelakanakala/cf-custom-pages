async function getPostureInfo(identityData, apiPostureData) {
  try {
    if (identityData.error) {
      throw new Error(identityData.error);
    }

    // Extract device posture information from identity data
    const device = identityData.device_sessions?.[0]?.device || {};
    let devicePosture = identityData.device_posture || device.device_posture || {};
    
    // Prioritize API posture data if available (from Cloudflare API)
    if (apiPostureData?.result) {
      devicePosture = apiPostureData.result;
    }
    
    // Check for Crowdstrike in various possible fields
    const crowdstrikeCheck = devicePosture.checks?.find(check => 
      check.type === 'crowdstrike' || 
      check.name?.toLowerCase().includes('crowdstrike')
    );
    const crowdstrikeEnabled = crowdstrikeCheck?.success || false;

    // Check OS version status
    const osVersionCheck = devicePosture.checks?.find(check => 
      check.type === 'os_version' || 
      check.name?.toLowerCase().includes('os')
    );
    const osUpToDate = osVersionCheck?.success !== false; // Default to true if not found

    const result = {
      crowdstrikeEnabled: crowdstrikeEnabled,
      osUpToDate: osUpToDate
    };
    
    return result;
  } catch (error) {
    console.error("Error processing posture info:", error);
    throw error;
  }
}
