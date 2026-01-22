import { get, patch, post } from "../utils/request";
import { mockDelay, MOCK_INTAKE_EVENTS, MOCK_PROFILES } from "../mock/fakeData";

// --- CẤU HÌNH ---
const USE_MOCK = false;

const buildQuery = (params) => {
    const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
    return qs ? `?${qs}` : "";
};

// ✅ API Contract
const PATH_INTAKE_LIST = (profileId) =>
    `/patient-profiles/${encodeURIComponent(profileId)}/intake-events`;

const PATH_INTAKE_PATCH = (intakeEventId) =>
    `/intake-events/${encodeURIComponent(intakeEventId)}`;

/**
 * Helper: nếu truyền YYYY-MM-DD thì auto bọc thành ISO UTC
 * Contract dùng query: from, to
 */
const toFrom = (d) => (String(d).includes("T") ? d : `${d}T00:00:00Z`);
const toTo = (d) => (String(d).includes("T") ? d : `${d}T23:59:59Z`);

/**
 * Helper: range -> {from,to} ISO
 * - week: Monday 00:00 -> Sunday 23:59:59 (UTC-ish ISO)
 * - month: first day -> last day
 */
const computeRangeISO = (range = "week") => {
    const now = new Date();

    if (range === "month") {
        const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
        const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
        return { from: from.toISOString(), to: to.toISOString() };
    }

    // default week (Mon-Sun)
    const day = now.getUTCDay(); // 0 Sun .. 6 Sat
    const diffToMon = (day + 6) % 7;
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    from.setUTCDate(from.getUTCDate() - diffToMon);

    const to = new Date(from);
    to.setUTCDate(from.getUTCDate() + 6);
    to.setUTCHours(23, 59, 59, 999);

    return { from: from.toISOString(), to: to.toISOString() };
};

/**
 * Normalize intake events response -> array
 */
const unwrapList = (res) => {
    const items = res?.data?.data ?? res?.data ?? res ?? [];
    return Array.isArray(items) ? items : [];
};

/**
 * Normalize status -> taken/skipped/missed/pending/other
 * ⚠️ Bạn chỉnh mapping khi biết status BE trả về (ví dụ: TAKEN/SKIPPED/MISSED)
 */
const normalizeStatus = (raw) => {
    const s = String(raw ?? "").trim().toLowerCase();

    if (["taken", "done", "completed", "success", "checkin", "checked_in"].includes(s)) return "taken";
    if (["skipped", "skip"].includes(s)) return "skipped";
    if (["missed", "late", "overdue", "expired", "not_taken"].includes(s)) return "missed";
    if (["pending", "scheduled", "upcoming", "planned"].includes(s)) return "pending";

    // nếu BE trả enum uppercase:
    if (s === "taken".toUpperCase().toLowerCase()) return "taken"; // harmless
    return "other";
};

/**
 * Label để group most_missed
 * Ưu tiên: drug/medicine name -> regimen name -> Unknown
 */
const getEventLabel = (e) => {
    return (
        e?.drug_name ||
        e?.medicine_name ||
        e?.medication_name ||
        e?.regimen_name ||
        e?.regimen?.name ||
        e?.drug?.name ||
        e?.drug_product?.brand_name ||
        e?.drug_product?.name ||
        "Unknown"
    );
};

/**
 * UC-IE1: List intake events in time range
 * GET /patient-profiles/{profileId}/intake-events
 * Query: from, to, status?, regimen_id?
 *
 * NOTE: Hàm này hiện return raw response (đúng theo code bạn).
 * Nếu bạn muốn dùng list trực tiếp -> dùng getIntakeEvents() bên dưới.
 */
export const getIntakeSchedule = async (profileId, fromDate, toDate, options = {}) => {
    if (!profileId) throw new Error("profileId is required");
    if (!fromDate || !toDate) throw new Error("fromDate and toDate are required");

    const params = {
        from: toFrom(fromDate),
        to: toTo(toDate),
        status: options.status,
        regimen_id: options.regimenId,
    };

    const url = `${PATH_INTAKE_LIST(profileId)}${buildQuery(params)}`;
    console.log("[Intake] GET intake-events URL:", url);

    return await get(url);
};

/**
 * ✅ Hàm mới: lấy intake events và trả về array (đỡ phải unwrap ở UI)
 */
export const getIntakeEvents = async (profileId, fromDate, toDate, options = {}) => {
    if (!profileId) throw new Error("profileId is required");
    if (!fromDate || !toDate) throw new Error("fromDate and toDate are required");

    if (USE_MOCK) {
        await mockDelay(250);
        // lọc mock theo ngày nếu bạn muốn (tạm trả hết)
        return MOCK_INTAKE_EVENTS ?? [];
    }

    const res = await getIntakeSchedule(profileId, fromDate, toDate, options);
    return unwrapList(res);
};

/**
 * UC-IE2 & UC-IE4: Update intake event (check-in)
 * PATCH /intake-events/{intakeEventId}
 * Body: {"status?","taken_time?","dose_amount_taken?","notes?"}
 */
export const updateIntakeStatus = async (intakeEventId, patchData = {}) => {
    if (!intakeEventId) throw new Error("intakeEventId is required");

    const payload = {};
    if (patchData.status !== undefined) payload.status = patchData.status;
    if (patchData.taken_time !== undefined) payload.taken_time = patchData.taken_time;
    if (patchData.dose_amount_taken !== undefined) payload.dose_amount_taken = patchData.dose_amount_taken;
    if (patchData.notes !== undefined) payload.notes = patchData.notes;

    if (payload.status === "taken" && payload.taken_time === undefined) {
        payload.taken_time = new Date().toISOString();
    }

    if (USE_MOCK) {
        await mockDelay(400);
        const idx = MOCK_INTAKE_EVENTS.findIndex((e) => e.id === intakeEventId);
        if (idx === -1) return null;
        MOCK_INTAKE_EVENTS[idx] = { ...MOCK_INTAKE_EVENTS[idx], ...payload };
        return MOCK_INTAKE_EVENTS[idx];
    }

    return await patch(PATH_INTAKE_PATCH(intakeEventId), payload);
};

/**
 * ✅ UC-IE3 (FE): Compliance stats computed from UC-IE1
 * Không cần endpoint /stats
 *
 * @param profileId string
 * @param range 'week' | 'month' | {from,to} | {fromDate,toDate}
 */
export const getComplianceStats = async (profileId, range = "week") => {
    if (!profileId) throw new Error("profileId is required");

    // mock stats (giữ lại)
    if (USE_MOCK) {
        await mockDelay(350);
        return {
            adherence_rate: 85,
            taken_count: range === "week" ? 42 : 180,
            skipped_count: range === "week" ? 5 : 20,
            missed_count: range === "week" ? 3 : 15,
            total_scheduled: range === "week" ? 50 : 215,
            most_missed: [
                { name: "Panadol", count: 3 },
                { name: "Vitamin C", count: 1 },
            ],
        };
    }

    // Resolve from/to
    let from, to;

    if (typeof range === "object" && range) {
        // support {from,to} ISO
        if (range.from && range.to) {
            from = range.from;
            to = range.to;
        } else if (range.fromDate && range.toDate) {
            from = toFrom(range.fromDate);
            to = toTo(range.toDate);
        } else {
            const r = computeRangeISO("week");
            from = r.from; to = r.to;
        }
    } else {
        const r = computeRangeISO(range);
        from = r.from; to = r.to;
    }

    // Fetch events
    const events = await getIntakeEvents(profileId, from, to);

    let taken = 0;
    let skipped = 0;
    let missed = 0;
    let pending = 0;

    const missedMap = new Map();

    for (const e of events) {
        const st = normalizeStatus(e?.status);

        if (st === "taken") taken++;
        else if (st === "skipped") skipped++;
        else if (st === "missed") {
            missed++;
            const name = getEventLabel(e);
            missedMap.set(name, (missedMap.get(name) ?? 0) + 1);
        } else if (st === "pending") pending++;
    }

    /**
     * total_scheduled:
     * - Nếu BE đã tạo intake_event cho mỗi lần "scheduled" => pending sẽ có và total phản ánh đúng.
     * - Nếu BE chỉ tạo record khi check-in/skip/miss => pending=0 => total = taken+skipped+missed.
     */
    const total_scheduled = taken + skipped + missed + pending;

    const adherence_rate = total_scheduled > 0
        ? Math.round((taken / total_scheduled) * 100)
        : 0;

    const most_missed = Array.from(missedMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    return {
        adherence_rate,
        taken_count: taken,
        skipped_count: skipped,
        missed_count: missed,
        total_scheduled,
        most_missed,
    };
};

/**
 * ✅ Hàm mới (tuỳ chọn): tổng hợp cho "all profiles"
 * Nếu bạn giữ tab "Tất cả" ở UI.
 */
export const getComplianceStatsAllProfiles = async (profiles, range = "week") => {
    const list = profiles?.length ? profiles : (USE_MOCK ? MOCK_PROFILES : []);
    if (!list?.length) throw new Error("profiles is required for all-profiles stats");

    const results = await Promise.all(
        list.map((p) => getComplianceStats(p.id, range))
    );

    const merged = results.reduce(
        (acc, s) => {
            acc.taken_count += s.taken_count;
            acc.skipped_count += s.skipped_count;
            acc.missed_count += s.missed_count;
            acc.total_scheduled += s.total_scheduled;

            // merge most_missed
            for (const mm of s.most_missed || []) {
                acc._missedMap.set(mm.name, (acc._missedMap.get(mm.name) ?? 0) + mm.count);
            }
            return acc;
        },
        { taken_count: 0, skipped_count: 0, missed_count: 0, total_scheduled: 0, _missedMap: new Map() }
    );

    merged.adherence_rate =
        merged.total_scheduled > 0
            ? Math.round((merged.taken_count / merged.total_scheduled) * 100)
            : 0;

    merged.most_missed = Array.from(merged._missedMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    delete merged._missedMap;
    return merged;
};

/**
 * UC-EX1: Export PDF
 * POST /patient-profiles/{profileId}/export-pdf
 * NOTE: trong PATH bạn đang có /api/v1/..., còn các PATH trên đang không có /api/v1.
 * Hãy đồng bộ theo utils/request baseURL của bạn.
 */
export const exportCompliancePDF = async (profileId) => {
    if (!profileId) throw new Error("profileId is required");
    return await post(`/patient-profiles/${encodeURIComponent(profileId)}/export-pdf`);
};
