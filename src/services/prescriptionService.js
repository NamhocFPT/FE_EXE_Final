// services/prescriptionService.js
import { get, post, patch, del, postMultipart } from "../utils/request";

// ==============================
// PATHS (base đã có /api/v1)
// ==============================
const PATH_PROFILE_PRESCRIPTIONS = (profileId) =>
  `/patient-profiles/${encodeURIComponent(profileId)}/prescriptions`;

const PATH_PRESCRIPTION_DETAIL = (prescriptionId) =>
  `/prescriptions/${encodeURIComponent(prescriptionId)}`;

// PrescriptionItems
const PATH_PRESCRIPTION_ITEMS = (prescriptionId) =>
  `/prescriptions/${encodeURIComponent(prescriptionId)}/items`;

const PATH_PRESCRIPTION_ITEM_DETAIL = (itemId) =>
  `/prescription-items/${encodeURIComponent(itemId)}`;

// PrescriptionFiles
const PATH_PRESCRIPTION_FILES = (prescriptionId) =>
  `/prescriptions/${encodeURIComponent(prescriptionId)}/files`;

const PATH_PRESCRIPTION_FILE_DETAIL = (fileId) =>
  `/prescription-files/${encodeURIComponent(fileId)}`;

// Intake events (nếu bạn còn dùng)
const PATH_INTAKE_EVENTS = (profileId) =>
  `/patient-profiles/${encodeURIComponent(profileId)}/intake-events`;

// ==============================
// Helpers
// ==============================
export const pickArray = (res) => {
  const payload = res?.data ?? res;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
};

// ==============================
// 1) PRESCRIPTIONS
// ==============================

/**
 * GET /patient-profiles/{profileId}/prescriptions
 * Query: status?, limit?, offset?
 */
export const getPrescriptions = async (profileId, options = {}) => {
  if (!profileId) throw new Error("profileId is required");

  return await get(PATH_PROFILE_PRESCRIPTIONS(profileId), {
    status: options.status,
    limit: options.limit,
    offset: options.offset,
  });
};

// alias cho UI cũ
export const getProfilePrescriptions = getPrescriptions;

/**
 * POST /patient-profiles/{profileId}/prescriptions
 * Body: {"prescriber_name?","prescriber_specialty?","facility_name?","issued_date?","note?","source_type?"}
 */
export const createPrescription = async (profileId, data = {}) => {
  if (!profileId) throw new Error("profileId is required");

  const payload = {
    prescriber_name: data.prescriber_name ?? data.prescriberName ?? data.doctorName,
    prescriber_specialty: data.prescriber_specialty ?? data.prescriberSpecialty,
    facility_name: data.facility_name ?? data.facilityName,
    issued_date: data.issued_date ?? data.issuedDate ?? data.date,
    note: data.note ?? data.notes,
    source_type: data.source_type ?? data.sourceType ?? "manual", // manual|scan
  };

  // remove undefined keys
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  return await post(PATH_PROFILE_PRESCRIPTIONS(profileId), payload);
};

/**
 * GET /prescriptions/{prescriptionId}
 * Response: { prescription, items[], files[] }
 */
export const getPrescriptionDetail = async (prescriptionId) => {
  if (!prescriptionId) throw new Error("prescriptionId is required");
  return await get(PATH_PRESCRIPTION_DETAIL(prescriptionId));
};

/**
 * PATCH /prescriptions/{prescriptionId}
 */
export const updatePrescription = async (prescriptionId, data = {}) => {
  if (!prescriptionId) throw new Error("prescriptionId is required");

  const payload = {
    ...(data.status !== undefined ? { status: data.status } : {}),
    ...(data.note !== undefined ? { note: data.note } : {}),
    ...(data.notes !== undefined ? { note: data.notes } : {}),
    ...(data.prescriberName !== undefined ? { prescriber_name: data.prescriberName } : {}),
    ...(data.prescriberSpecialty !== undefined
      ? { prescriber_specialty: data.prescriberSpecialty }
      : {}),
    ...(data.facilityName !== undefined ? { facility_name: data.facilityName } : {}),
    ...(data.issuedDate !== undefined ? { issued_date: data.issuedDate } : {}),
    ...(data.sourceType !== undefined ? { source_type: data.sourceType } : {}),
  };

  return await patch(PATH_PRESCRIPTION_DETAIL(prescriptionId), payload);
};

export const updatePrescriptionStatus = async (prescriptionId, status) => {
  console.log("[updatePrescriptionStatus] status =", status);
  if (!status) throw new Error("status is required");
  return await updatePrescription(prescriptionId, { status });
};

// ==============================
// 2) PRESCRIPTION ITEMS
// ==============================

/**
 * POST /prescriptions/{prescriptionId}/items
 */
export const addPrescriptionItem = async (prescriptionId, data = {}) => {
  if (!prescriptionId) throw new Error("prescriptionId is required");

  const payload = {
    original_name_text: data.original_name_text ?? data.originalNameText ?? data.name,
    original_instructions: data.original_instructions ?? data.originalInstructions,
    drug_product_id: data.drug_product_id ?? data.drugProductId,
    substance_id: data.substance_id ?? data.substanceId,
    dose_amount: data.dose_amount ?? data.doseAmount ?? data.dosage,
    dose_unit: data.dose_unit ?? data.doseUnit ?? data.unit,
    frequency_text: data.frequency_text ?? data.frequencyText,
    route: data.route,
    duration_days: data.duration_days ?? data.durationDays,
    start_date: data.start_date ?? data.startDate,
    end_date: data.end_date ?? data.endDate,
    is_prn: data.is_prn ?? data.isPrn,
    notes: data.notes,
  };

  if (!payload.original_name_text) throw new Error("original_name_text is required");

  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  return await post(PATH_PRESCRIPTION_ITEMS(prescriptionId), payload);
};

/**
 * PATCH /prescription-items/{itemId}
 */
export const updatePrescriptionItem = async (itemId, data = {}) => {
  if (!itemId) throw new Error("itemId is required");

  const payload = {
    ...(data.original_name_text !== undefined ? { original_name_text: data.original_name_text } : {}),
    ...(data.original_instructions !== undefined
      ? { original_instructions: data.original_instructions }
      : {}),
    ...(data.drug_product_id !== undefined ? { drug_product_id: data.drug_product_id } : {}),
    ...(data.substance_id !== undefined ? { substance_id: data.substance_id } : {}),
    ...(data.dose_amount !== undefined ? { dose_amount: data.dose_amount } : {}),
    ...(data.dose_unit !== undefined ? { dose_unit: data.dose_unit } : {}),
    ...(data.frequency_text !== undefined ? { frequency_text: data.frequency_text } : {}),
    ...(data.route !== undefined ? { route: data.route } : {}),
    ...(data.duration_days !== undefined ? { duration_days: data.duration_days } : {}),
    ...(data.start_date !== undefined ? { start_date: data.start_date } : {}),
    ...(data.end_date !== undefined ? { end_date: data.end_date } : {}),
    ...(data.is_prn !== undefined ? { is_prn: data.is_prn } : {}),
    ...(data.notes !== undefined ? { notes: data.notes } : {}),
  };

  return await patch(PATH_PRESCRIPTION_ITEM_DETAIL(itemId), payload);
};

/**
 * DELETE /prescription-items/{itemId}
 */
export const deletePrescriptionItem = async (itemId) => {
  if (!itemId) throw new Error("itemId is required");
  return await del(PATH_PRESCRIPTION_ITEM_DETAIL(itemId));
};

// ==============================
// 3) PRESCRIPTION FILES
// ==============================

/**
 * POST /prescriptions/{prescriptionId}/files
 * multipart/form-data: file, file_type?
 */
export const uploadPrescriptionFile = async (prescriptionId, imageObj, fileType) => {
  if (!prescriptionId) throw new Error("prescriptionId is required");
  if (!imageObj?.uri) throw new Error("image uri is required");

  const form = new FormData();
  form.append("file", {
    uri: imageObj.uri,
    name: imageObj.name || `pres_${Date.now()}.jpg`,
    type: imageObj.type || "image/jpeg",
  });

  if (fileType) form.append("file_type", fileType);

  return await postMultipart(PATH_PRESCRIPTION_FILES(prescriptionId), form);
};

export const uploadPrescriptionFiles = async (prescriptionId, images = [], fileType) => {
  if (!Array.isArray(images) || images.length === 0) return [];
  const results = [];
  for (const img of images) {
    const res = await uploadPrescriptionFile(prescriptionId, img, fileType);
    results.push(res);
  }
  return results;
};

/**
 * DELETE /prescription-files/{fileId}
 */
export const deletePrescriptionFile = async (fileId) => {
  if (!fileId) throw new Error("fileId is required");
  return await del(PATH_PRESCRIPTION_FILE_DETAIL(fileId));
};

// ==============================
// 4) ADHERENCE LOGS (intake-events) - nếu backend có
// ==============================
const toFrom = (d) => (d.includes("T") ? d : `${d}T00:00:00Z`);
const toTo = (d) => (d.includes("T") ? d : `${d}T23:59:59Z`);

export const getAdherenceLogs = async (profileId, fromDate, toDate, options = {}) => {
  if (!profileId) throw new Error("profileId is required");
  if (!fromDate || !toDate) throw new Error("fromDate and toDate are required");

  return await get(PATH_INTAKE_EVENTS(profileId), {
    from: toFrom(fromDate),
    to: toTo(toDate),
    status: options.status,
    regimen_id: options.regimenId,
  });
};
