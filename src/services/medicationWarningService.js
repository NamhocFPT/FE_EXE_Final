import { get } from "../utils/request";

export const getMedicationWarnings = async (profileId) => {
    return get(`/patient-profiles/${profileId}/medication-warnings`);
};