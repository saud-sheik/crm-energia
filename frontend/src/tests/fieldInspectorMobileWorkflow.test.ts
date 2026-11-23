import { getStatusStyle, getInspectionRag, SiteInspectionRecord } from "../lib/siteInspection";

describe("Field Inspector Mobile Workflow & Logic Unit Tests", () => {
  const mockInspection: Partial<SiteInspectionRecord> = {
    id: "insp-001",
    inspectionNumber: "SI-2026-0042",
    status: "REQUESTED",
    assignmentState: "ASSIGNED",
    priority: "URGENT",
    clientOrganization: "Saudi Aramco Gas Plant #4",
    clientRepName: "Eng. Tariq",
    clientRepPhone: "+966 50 123 4567",
    latitude: 27.012345,
    longitude: 49.654321,
    siteAreaName: "Jubail Industrial 2",
    dueAt: new Date(Date.now() + 3600 * 1000 * 24).toISOString(),
    services: [
      {
        serviceType: "SEWAGE",
        isActive: true,
        facilityName: "Jubail Industrial Wastewater Treatment Plant",
        estimatedVolume: 40,
        volumeUnit: "m3",
        distanceKm: 25,
      },
      {
        serviceType: "GENERAL",
        isActive: false,
        distanceKm: 0,
      },
    ],
    attachments: [
      {
        id: "att-1",
        inspectionId: "insp-001",
        fileName: "gate_entry.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1048576,
        storagePath: "/uploads/gate_entry.jpg",
        tag: "Gate / Access Point",
      },
    ],
  };

  test("1. Mobile Navigation & WhatsApp Quick Action Formatter", () => {
    // Google Maps Navigation URL format
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mockInspection.latitude},${mockInspection.longitude}&travelmode=driving`;
    expect(mapsUrl).toBe("https://www.google.com/maps/dir/?api=1&destination=27.012345,49.654321&travelmode=driving");

    // WhatsApp Direct Contact message generator
    const cleanPhone = (mockInspection.clientRepPhone || "").replace(/\D/g, "");
    expect(cleanPhone).toBe("966501234567");

    const waText = `Hello ${mockInspection.clientRepName || "Client"}, I am the Nexus site inspector assigned for inspection ${mockInspection.inspectionNumber}. Could you please share your site gate number or WhatsApp live location pin?`;
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`;

    expect(waUrl).toContain("https://wa.me/966501234567");
    expect(waUrl).toContain("SI-2026-0042");
    expect(waUrl).toContain("Eng.%20Tariq");
  });

  test("2. Mobile Status and SLA Badge Resolver", () => {
    const statusInfo = getStatusStyle(mockInspection.status || "REQUESTED");
    expect(statusInfo.label).toBe("Requested");
    expect(statusInfo.dotColor).toBe("bg-amber-500");

    const rag = getInspectionRag(mockInspection as SiteInspectionRecord);
    expect(rag).toHaveProperty("badgeBg");
    expect(rag).toHaveProperty("dotColor");
    expect(rag).toHaveProperty("countdown");
  });

  test("3. Pre-Submission Completeness Validation Logic", () => {
    function validateSurveyDraft(formData: Partial<SiteInspectionRecord>, services: any[], attachments: any[]) {
      const errors: string[] = [];
      if (!formData.baseId) errors.push("Please select an Operations Base depot.");
      const activeSc = services.filter((s) => s.isActive);
      if (activeSc.length === 0) errors.push("At least one Service Scope must be toggled on.");
      if (!formData.latitude || !formData.longitude) errors.push("Site GPS coordinates are required.");
      if (!attachments || attachments.length === 0) {
        errors.push("At least one on-site photo must be captured.");
      }
      return { valid: errors.length === 0, errors };
    }

    // Incomplete draft (missing base and GPS)
    const incomplete = validateSurveyDraft({}, [], []);
    expect(incomplete.valid).toBe(false);
    expect(incomplete.errors).toContain("Please select an Operations Base depot.");
    expect(incomplete.errors).toContain("At least one Service Scope must be toggled on.");
    expect(incomplete.errors).toContain("Site GPS coordinates are required.");
    expect(incomplete.errors).toContain("At least one on-site photo must be captured.");

    // Complete valid draft with offline queued photos
    const completeWithOfflinePhoto = validateSurveyDraft(
      { baseId: "base-jubail-01", latitude: 27.012, longitude: 49.654 },
      [{ serviceType: "SEWAGE", isActive: true }],
      [{ id: "off-photo-1", isOffline: true }]
    );
    expect(completeWithOfflinePhoto.valid).toBe(true);
    expect(completeWithOfflinePhoto.errors.length).toBe(0);

    // Complete valid draft
    const complete = validateSurveyDraft(
      { baseId: "base-jubail-01", latitude: 27.012, longitude: 49.654 },
      [{ serviceType: "SEWAGE", isActive: true }],
      [{ id: "att-1" }]
    );
    expect(complete.valid).toBe(true);
    expect(complete.errors.length).toBe(0);
  });

  test("4. Duty Filter & Tab Bucketing Logic", () => {
    const duties: Array<Partial<SiteInspectionRecord>> = [
      { id: "1", status: "REQUESTED", assignmentState: "ASSIGNED" },
      { id: "2", status: "DRAFT", assignmentState: "VISIT_STARTED", startedAt: "2026-11-23T08:00:00Z" },
      { id: "3", status: "SUBMITTED", assignmentState: "ACCEPTED" },
      { id: "4", status: "APPROVED", assignmentState: "ACCEPTED" },
      { id: "5", status: "REQUESTED", assignmentState: "DECLINED" },
    ];

    const todayTab = duties.filter(
      (d) => !["APPROVED", "CANCELLED"].includes(d.status || "") && d.assignmentState !== "DECLINED"
    );
    expect(todayTab.map((d) => d.id)).toEqual(["1", "2", "3"]);

    const pendingTab = duties.filter(
      (d) => d.assignmentState === "ASSIGNED" || d.assignmentState === "PENDING_CONFIRMATION"
    );
    expect(pendingTab.map((d) => d.id)).toEqual(["1"]);

    const inReviewTab = duties.filter((d) => d.status === "SUBMITTED");
    expect(inReviewTab.map((d) => d.id)).toEqual(["3"]);

    const approvedTab = duties.filter((d) => d.status === "APPROVED");
    expect(approvedTab.map((d) => d.id)).toEqual(["4"]);
  });
});
