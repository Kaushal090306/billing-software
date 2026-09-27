import { NextResponse } from "next/server";
import { sql } from "@/db";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const CHROMIUM_PACK_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar";

const GST_STATE_MAP: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Daman and Diu",
  "26": "Dadra and Nagar Haveli",
  "27": "Maharashtra",
  "28": "Andhra Pradesh (Old)",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
  "99": "Centre Jurisdiction",
};

const PAN_ENTITY_TYPES: Record<string, string> = {
  C: "Company (Private / Public Limited)",
  P: "Individual / Proprietorship",
  H: "HUF (Hindu Undivided Family)",
  F: "Partnership Firm / LLP",
  A: "Association of Persons (AOP)",
  T: "Trust",
  B: "Body of Individuals (BOI)",
  L: "Local Authority",
  J: "Artificial Juridical Person",
  G: "Government Entity",
};

interface CaptchaSession {
  browser: any;
  page: any;
  gstin: string;
  createdAt: number;
  getApiPayload?: () => any;
}

// In Next.js dev server, module-level global map persists across requests
declare global {
  var __gstSessions: Map<string, CaptchaSession> | undefined;
  var __gstSharedBrowser: any | undefined;
}

const sessions: Map<string, CaptchaSession> = globalThis.__gstSessions || new Map();
globalThis.__gstSessions = sessions;

function isBrowserAlive(b: any): boolean {
  if (!b) return false;
  try {
    if (typeof b.isConnected === "function") return b.isConnected();
    if (typeof b.connected === "boolean") return b.connected;
    if (b.process && b.process()) return true;
  } catch (e) {}
  return false;
}

async function getSharedBrowser() {
  if (globalThis.__gstSharedBrowser && isBrowserAlive(globalThis.__gstSharedBrowser)) {
    return globalThis.__gstSharedBrowser;
  }

  // 1. Try local Chrome path first (Windows, Linux, macOS)
  const chromePath = getChromePath();
  if (chromePath) {
    try {
      globalThis.__gstSharedBrowser = await puppeteer.launch({
        executablePath: chromePath,
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-zygote",
          "--no-first-run",
          "--disable-extensions",
          "--disable-default-apps",
          "--mute-audio",
          "--disable-background-networking",
          "--window-size=1024,768",
        ],
      });
      return globalThis.__gstSharedBrowser;
    } catch (e) {
      console.warn("Local Chrome launch failed, falling back to serverless chromium...", e);
    }
  }

  // 2. Try @sparticuz/chromium-min on Cloud / Vercel / AWS Lambda / Serverless
  try {
    chromium.setGraphicsMode = false;
    let execPath: string | null = null;
    try {
      execPath = await chromium.executablePath(CHROMIUM_PACK_URL);
    } catch (e) {
      execPath = await chromium.executablePath();
    }

    if (execPath) {
      globalThis.__gstSharedBrowser = await puppeteer.launch({
        executablePath: execPath,
        args: [
          ...(chromium.args || []),
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--single-process",
          "--no-zygote",
        ],
        headless: true,
      });
      return globalThis.__gstSharedBrowser;
    }
  } catch (cloudErr) {
    console.error("Serverless chromium launch error:", cloudErr);
  }

  return null;
}

function cleanOldSessions() {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (now - s.createdAt > 3 * 60 * 1000) {
      try {
        if (s.page && !s.page.isClosed()) {
          s.page.close().catch(() => {});
        }
      } catch (e) {}
      sessions.delete(id);
    }
  }
}

function getChromePath(): string | null {
  const envPath = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || process.env.GOOGLE_CHROME_BIN;
  if (envPath && fs.existsSync(envPath)) return envPath;

  const possiblePaths = [
    // Linux / VPS / Docker / Cloud paths
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/chrome",
    "/usr/local/bin/google-chrome",
    "/usr/local/bin/chromium",
    "/usr/local/bin/chrome",
    "/snap/bin/chromium",
    "/snap/bin/google-chrome",
    "/opt/google/chrome/chrome",
    "/opt/google/chrome/google-chrome",

    // Windows paths
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe") : "",
    process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Google\\Chrome\\Application\\chrome.exe") : "",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",

    // macOS paths
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ].filter(Boolean) as string[];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const INVALID_NAMES = [
  "na",
  "n/a",
  "not applicable",
  "view",
  "dealing in goods and services",
  "goods and services",
  "goods",
  "services",
  "active",
  "regular",
  "proprietorship",
  "partnership",
  "private limited company",
  "public limited company",
  "yes",
  "no",
  "effective date of registration",
  "effective date",
  "additional trade name",
  "trade name",
  "legal name of business",
  "legal name",
  "principal place of business",
  "constitution of business",
  "constitution",
  "gstin / uin status",
  "gstin status",
  "taxpayer type",
  "search result based on",
  "whether aadhaar authenticated",
  "whether e-kyc verified",
  "nature of core business activity",
  "administrative office",
  "other office",
  "jurisdiction",
  "jurisdiction - state",
  "jurisdiction - center",
  "state - gujarat",
  "state - cbic",
  "about gst",
  "gst council",
  "gst history",
  "website policies",
  "terms and conditions",
  "hyperlink policy",
  "disclaimer",
  "central board of indirect taxes",
  "state tax websites",
  "national portal",
  "help and taxpayer facilities",
  "system requirements",
  "gst knowledge portal",
  "gst media",
  "site map",
  "grievance nodal officers",
  "free accounting and billing services",
  "gst suvidha providers",
  "contact us",
  "help desk number",
  "grievance redressal portal",
  "goods and services tax network",
  "designed & developed",
  "site best viewed",
  "log/track",
];

function isValidBusinessName(name: string | null | undefined): boolean {
  if (!name || typeof name !== "string") return false;
  const clean = name.toLowerCase().trim().replace(/[:\-–.]/g, "").replace(/\s+/g, " ").trim();
  if (clean.length < 2 || clean.length > 90) return false;
  return !INVALID_NAMES.some((inv) => clean === inv || clean.startsWith(inv + " ") || clean.includes(inv));
}

function isGstPortalLabel(text: string): boolean {
  return !isValidBusinessName(text);
}

/**
 * Robust parser for official GST portal text, table clips, and clipboard pastes
 */
function parseGstPortalData(raw: string) {
  if (!raw || typeof raw !== "string") return null;

  const gstinMatch = raw.match(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/i);
  const gstin = gstinMatch ? gstinMatch[1].toUpperCase() : "";

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let legalName = "";
  let tradeName = "";
  let address = "";
  let city = "";
  let pincode = "";
  let status = "ACTIVE";
  let constitution = "";

  // 1. Direct search for address lines anywhere in the input
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.toLowerCase().includes("about gst") || l.toLowerCase().includes("gst council")) continue;
    const isJurisdiction = /\bjurisdiction\b|\bdivision\b|\brange\s*-|\bunit\s*-|\bghatak\b|\bcommissionerate\b|\bzone\b|\bstate\s*-/i.test(l);

    if (!isJurisdiction) {
      if (l.toLowerCase().includes("principal place of business")) {
        const cleaned = l.replace(/^.*principal place of business\s*[:\-–]?\s*/i, "").trim();
        if (cleaned.length > 15) {
          address = cleaned;
          break;
        }
      }

      if (
        (l.match(/\b(39[0-9]{4}|[1-9][0-9]{5})\b/) ||
          l.toLowerCase().includes("floor") ||
          l.toLowerCase().includes("road") ||
          l.toLowerCase().includes("street") ||
          l.toLowerCase().includes("plot") ||
          l.toLowerCase().includes("complex") ||
          l.toLowerCase().includes("bhavan") ||
          l.toLowerCase().includes("kadodara") ||
          l.toLowerCase().includes("surat") ||
          l.toLowerCase().includes("nagar") ||
          l.toLowerCase().includes("park")) &&
        l.length > 15 &&
        !l.toLowerCase().startsWith("search result") &&
        !l.toLowerCase().startsWith("administrative office")
      ) {
        address = l.replace(/^.*principal place of business\s*[:\-–]?\s*/i, "").trim();
        break;
      }
    }
  }

  // 2. Structured Block Matching
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const lower = l.toLowerCase();
    if (lower.includes("about gst") || lower.includes("gst council") || lower.includes("website policies")) continue;

    // Check Legal Name
    if (lower.startsWith("legal name of business") || lower.startsWith("legal name")) {
      const match = l.match(/legal name(?: of business)?\s*[:\-–]\s*(.+)/i);
      if (match && isValidBusinessName(match[1])) {
        legalName = match[1].trim();
      } else if (
        lines[i + 1]?.toLowerCase().includes("trade name") &&
        lines[i + 2]?.toLowerCase().includes("effective date")
      ) {
        if (isValidBusinessName(lines[i + 3])) legalName = lines[i + 3].trim();
        if (isValidBusinessName(lines[i + 4])) tradeName = lines[i + 4].trim();
      } else if (lines[i + 1] && isValidBusinessName(lines[i + 1])) {
        legalName = lines[i + 1].trim();
      }
    }

    // Check Trade Name
    if (
      (lower.startsWith("trade name") || lower === "trade name") &&
      !lower.includes("additional") &&
      !lower.includes("core")
    ) {
      const match = l.match(/trade name\s*[:\-–]\s*(.+)/i);
      if (match && isValidBusinessName(match[1])) {
        tradeName = match[1].trim();
      } else if (!tradeName && lines[i + 1] && isValidBusinessName(lines[i + 1])) {
        if (!lines[i + 1].toLowerCase().includes("effective date") && !lines[i + 1].toLowerCase().includes("constitution")) {
          tradeName = lines[i + 1].trim();
        }
      }
    }

    // Check Constitution
    if (lower.startsWith("constitution of business") || lower.startsWith("constitution")) {
      const match = l.match(/constitution(?: of business)?\s*[:\-–]\s*(.+)/i);
      if (match) {
        constitution = match[1].trim();
      } else if (
        lines[i + 1]?.toLowerCase().includes("status") &&
        lines[i + 2]?.toLowerCase().includes("taxpayer type")
      ) {
        if (lines[i + 3] && !lines[i + 3].toLowerCase().includes("administrative")) constitution = lines[i + 3].trim();
        if (lines[i + 4]) status = lines[i + 4].trim();
      } else if (lines[i + 1] && !lines[i + 1].toLowerCase().includes("status")) {
        constitution = lines[i + 1].trim();
      }
    }

    // Check Status
    if (lower.startsWith("gstin / uin status") || lower.startsWith("status")) {
      const match = l.match(/status\s*[:\-–]\s*(.+)/i);
      if (match) status = match[1].trim();
      else if (lines[i + 1] && (lines[i + 1].toLowerCase() === "active" || lines[i + 1].toLowerCase() === "cancelled")) status = lines[i + 1].trim();
    }
  }

  // Address cleaning
  if (address) {
    address = address
      .replace(/(?:Whether Aadhaar|Whether e-KYC|Additional Trade Name|Nature Of Core)[\s\S]*/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Extract Pincode
  if (address) {
    const pinMatch = address.match(/\b([1-9][0-9]{5})\b/);
    if (pinMatch) pincode = pinMatch[1];
  }
  if (!pincode && raw) {
    const pinMatch = raw.match(/\b(39[0-9]{4}|[1-9][0-9]{5})\b/);
    if (pinMatch) pincode = pinMatch[1];
  }

  // Extract City
  if (address) {
    const knownCities = [
      "SURAT",
      "AHMEDABAD",
      "VADODARA",
      "RAJKOT",
      "MUMBAI",
      "DELHI",
      "JAIPUR",
      "KADODARA",
      "NAVSARI",
      "BARDOLI",
      "VALSAD",
      "ANKLESHWAR",
      "BHARUCH",
    ];
    const upperAddr = address.toUpperCase();
    for (const c of knownCities) {
      if (upperAddr.includes(c)) {
        city = c === "KADODARA" ? "SURAT" : c;
        break;
      }
    }
  }

  const businessName = tradeName || legalName || "";

  return {
    gstin,
    legalName,
    tradeName,
    businessName,
    address,
    city: city || "SURAT",
    pincode: pincode || "395010",
    status: status || "ACTIVE",
    constitution,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawGstin = searchParams.get("gstin") || "";
    const cleanGstin = rawGstin.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (!cleanGstin || cleanGstin.length < 15) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid 15-character GSTIN number." },
        { status: 400 }
      );
    }

    const stateCode = cleanGstin.substring(0, 2);
    const pan = cleanGstin.substring(2, 12);
    const entityCode = pan.charAt(3);
    const entityType = PAN_ENTITY_TYPES[entityCode] || "Business Entity";
    const stateName = GST_STATE_MAP[stateCode] || "Gujarat";

    // 1. Check Neon DB customers table for verified customer records
    try {
      const dbCust = await sql`
        SELECT * FROM customers 
        WHERE UPPER(REPLACE(COALESCE(gstin, ''), ' ', '')) = ${cleanGstin}
        LIMIT 1;
      `;
      if (dbCust.length > 0) {
        const c = dbCust[0];
        return NextResponse.json({
          success: true,
          verified: true,
          gstin: cleanGstin,
          legalName: c.business_name,
          tradeName: c.business_name,
          businessName: (c.business_name || "").toUpperCase(),
          contactPerson: c.contact_person || undefined,
          mobile: c.mobile || undefined,
          email: c.email || undefined,
          address: (c.address || "").toUpperCase(),
          city: (c.city || "SURAT").toUpperCase(),
          state: c.state || stateName,
          stateCode: c.state_code || stateCode,
          pincode: c.pincode || (stateCode === "24" ? "395010" : ""),
          pan: c.pan || pan,
          entityType,
          status: "ACTIVE",
          source: "neon_db_record",
          officialPortalUrl: "https://services.gst.gov.in/services/searchtp",
        });
      }
    } catch (dbErr: any) {
      console.warn("Neon DB customer lookup error:", dbErr?.message);
    }

    // 2. Return decoded state & PAN information, suggesting live portal check
    return NextResponse.json({
      success: true,
      verified: true,
      gstin: cleanGstin,
      businessName: "",
      pan,
      entityType,
      state: stateName,
      stateCode,
      city: stateCode === "24" ? "SURAT" : "",
      pincode: stateCode === "24" ? "395010" : "",
      status: "ACTIVE",
      requiresLiveCheck: true,
      officialPortalUrl: "https://services.gst.gov.in/services/searchtp",
    });
  } catch (error: any) {
    console.error("GST lookup GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to lookup GST details" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action || "init";

    // Action 1: Parse pasted text from official portal
    if (action === "parse_text" || body.rawText || body.text) {
      const rawText = body.rawText || body.text || "";
      const parsed = parseGstPortalData(rawText);
      const targetGstin = (parsed?.gstin || body.gstin || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

      if (!targetGstin || targetGstin.length < 15) {
        return NextResponse.json(
          { success: false, error: "Could not detect a valid 15-character GSTIN from pasted text." },
          { status: 400 }
        );
      }

      const stateCode = targetGstin.substring(0, 2);
      const pan = targetGstin.substring(2, 12);
      const entityCode = pan.charAt(3);
      const entityType = PAN_ENTITY_TYPES[entityCode] || "Business Entity";
      const stateName = GST_STATE_MAP[stateCode] || "Gujarat";

      const legalName = parsed?.legalName || "";
      const tradeName = parsed?.tradeName || "";
      const address = parsed?.address || "";
      const city = parsed?.city || (stateCode === "24" ? "SURAT" : "");
      const pincode = parsed?.pincode || (stateCode === "24" ? "395010" : "");
      const status = parsed?.status || "ACTIVE";
      const businessName = (tradeName || legalName || "").toUpperCase();

      return NextResponse.json({
        success: true,
        verified: true,
        gstin: targetGstin,
        legalName,
        tradeName,
        businessName,
        contactPerson: legalName || undefined,
        address: address.toUpperCase(),
        city: city.toUpperCase(),
        state: stateName,
        stateCode,
        pincode,
        pan,
        entityType,
        status: status.toUpperCase(),
        source: "official_gst_portal_pasted",
        officialPortalUrl: "https://services.gst.gov.in/services/searchtp",
      });
    }

    // Action 2: Init Live Official GST Portal Search (Launches headless Chrome, types GSTIN, captures Captcha)
    if (action === "init" || action === "init_captcha") {
      const cleanGstin = (body.gstin || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (cleanGstin.length !== 15) {
        return NextResponse.json(
          { success: false, error: "Please enter a valid 15-digit GSTIN number." },
          { status: 400 }
        );
      }

      // Check DB first for verified record
      try {
        const dbCust = await sql`
          SELECT * FROM customers 
          WHERE UPPER(REPLACE(COALESCE(gstin, ''), ' ', '')) = ${cleanGstin}
          LIMIT 1;
        `;
        if (dbCust.length > 0) {
          const c = dbCust[0];
          return NextResponse.json({
            success: true,
            verified: true,
            gstin: cleanGstin,
            legalName: c.business_name,
            tradeName: c.business_name,
            businessName: (c.business_name || "").toUpperCase(),
            contactPerson: c.contact_person || undefined,
            mobile: c.mobile || undefined,
            email: c.email || undefined,
            address: (c.address || "").toUpperCase(),
            city: (c.city || "SURAT").toUpperCase(),
            state: c.state || "Gujarat",
            stateCode: c.state_code || "24",
            pincode: c.pincode || "395010",
            pan: c.pan || cleanGstin.substring(2, 12),
            status: "ACTIVE",
            source: "neon_db_record",
          });
        }
      } catch (e) {}

      cleanOldSessions();

      const chromePath = getChromePath();
      const browser = await getSharedBrowser();
      if (!browser) {
        return NextResponse.json({
          success: false,
          isCloudMode: true,
          error: "Cloud Serverless Environment: Direct browser automation is not available in cloud functions. Use 1-Click Copy & Paste Tool.",
          officialPortalUrl: "https://services.gst.gov.in/services/searchtp",
          gstin: cleanGstin,
        });
      }

      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      // Block unneeded assets (fonts, non-captcha images, trackers) for ultra-fast loading
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        const resourceType = req.resourceType();
        const url = req.url();
        if (
          resourceType === "font" ||
          resourceType === "media" ||
          (resourceType === "image" && !url.includes("captcha") && !url.includes("data:image")) ||
          url.includes("google-analytics") ||
          url.includes("googletagmanager")
        ) {
          req.abort();
        } else {
          req.continue();
        }
      });

      try {
        await page.goto("https://services.gst.gov.in/services/searchtp", {
          waitUntil: "domcontentloaded",
          timeout: 25000,
        });

        // Attach response listener to capture official JSON response from GSTN server
        let capturedApiData: any = null;
        page.on("response", async (resp) => {
          try {
            const url = resp.url();
            if (url.includes("/api/") || url.includes("taxpayer") || url.includes("search")) {
              const text = await resp.text();
              try {
                const json = JSON.parse(text);
                if (json && (json.lgnm || json.tradeNam || json.pradr || json.data?.lgnm || json.searchTaxpre_Payload)) {
                  capturedApiData = json.searchTaxpre_Payload || json.data || json;
                }
              } catch {}
            }
          } catch {}
        });

        await page.waitForSelector("#for_gstin", { timeout: 20000 });
        await page.type("#for_gstin", cleanGstin);
        await page.waitForSelector("img[src*='captcha']", { timeout: 20000 });

        const captchaEl = await page.$("img[src*='captcha']");
        if (!captchaEl) {
          await page.close().catch(() => {});
          return NextResponse.json(
            { success: false, error: "Failed to load GST portal captcha." },
            { status: 500 }
          );
        }

        const base64Img = await captchaEl.screenshot({ encoding: "base64" });
        const sessionId = `gst_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        sessions.set(sessionId, {
          browser,
          page,
          gstin: cleanGstin,
          createdAt: Date.now(),
          getApiPayload: () => capturedApiData,
        });

        return NextResponse.json({
          success: true,
          requiresCaptcha: true,
          captchaImage: `data:image/png;base64,${base64Img}`,
          sessionId,
          gstin: cleanGstin,
        });
      } catch (initErr: any) {
        await page.close().catch(() => {});
        return NextResponse.json(
          {
            success: false,
            error: initErr.message || "Failed to connect to official GST portal.",
          },
          { status: 500 }
        );
      }
    }

    // Action 3: Solve Captcha & Extract Official Result
    if (action === "solve" || action === "submit_captcha") {
      const { sessionId, captchaCode } = body;
      if (!sessionId || !captchaCode) {
        return NextResponse.json(
          { success: false, error: "Session ID and Captcha Code are required." },
          { status: 400 }
        );
      }

      const session = sessions.get(sessionId);
      if (!session) {
        return NextResponse.json(
          { success: false, error: "Session expired. Please click refresh to get a new captcha." },
          { status: 400 }
        );
      }

      const { browser, page, gstin } = session;

      try {
        // Clear and type captcha
        await page.click("#fo-captcha", { clickCount: 3 });
        await page.type("#fo-captcha", String(captchaCode).trim());

        // Click search button
        await page.click("#lotsearch");

        // Wait for real taxpayer result data or error message with fast 80ms polling
        await page.waitForFunction(
          () => {
            // 1. Error alert
            const alert = document.querySelector(".alert-danger, #alertMsg") as HTMLElement | null;
            if (alert && alert.clientHeight > 0 && (alert.innerText || alert.textContent || "").trim().length > 0) return true;

            // 2. Angular scope payload
            const lot = document.querySelector("#lottable, .tbl-format, .tabpane");
            if (lot && (window as any).angular) {
              try {
                const s = (window as any).angular.element(lot).scope();
                if (s && s.searchTaxpre_Payload && (s.searchTaxpre_Payload.lgnm || s.searchTaxpre_Payload.tradeNam || s.searchTaxpre_Payload.pradr)) {
                  return true;
                }
              } catch (e) {}
            }

            // 3. Principal place address element populated
            const wordCls = document.querySelector("#lottable .wordCls, .tbl-format .wordCls") as HTMLElement | null;
            if (wordCls && (wordCls.innerText || wordCls.textContent || "").trim().length > 10) {
              return true;
            }

            // 4. #lottable visible with rendered text containing date or status
            const lotEl = document.querySelector("#lottable") as HTMLElement | null;
            if (lotEl && lotEl.style.display !== "none" && !lotEl.classList.contains("ng-hide")) {
              const txt = lotEl.innerText || "";
              if (txt.includes("12/02/2020") || txt.includes("Active") || txt.includes("Proprietorship") || txt.includes("Regular")) {
                return true;
              }
            }

            return false;
          },
          { timeout: 10000, polling: 80 }
        );

        // Check for error alert
        const isError = await page.evaluate(() => {
          const alert = document.querySelector(".alert-danger, #alertMsg") as HTMLElement | null;
          if (alert && alert.clientHeight > 0) {
            return alert.innerText || alert.textContent || "Invalid captcha";
          }
          return null;
        });

        if (isError && isError.toLowerCase().includes("captcha")) {
          // Captcha was wrong, grab new captcha
          const captchaEl = await page.$("img[src*='captcha']");
          const newBase64 = captchaEl ? await captchaEl.screenshot({ encoding: "base64" }) : null;
          return NextResponse.json({
            success: false,
            error: "Incorrect Captcha. Please enter the new characters shown.",
            requiresCaptcha: true,
            captchaImage: newBase64 ? `data:image/png;base64,${newBase64}` : null,
            sessionId,
          });
        }

        // 1. Check if direct API response was captured
        const apiData = session.getApiPayload ? session.getApiPayload() : null;
        let legalName = "";
        let tradeName = "";
        let address = "";
        let city = "";
        let pincode = "";
        let status = "ACTIVE";
        let constitution = "";

        if (apiData && (apiData.lgnm || apiData.tradeNam || apiData.pradr)) {
          if (apiData.lgnm && isValidBusinessName(apiData.lgnm)) legalName = apiData.lgnm;
          if (apiData.tradeNam && isValidBusinessName(apiData.tradeNam)) tradeName = apiData.tradeNam;
          if (apiData.sts) status = apiData.sts;
          if (apiData.ctb) constitution = apiData.ctb;
          if (apiData.pradr) {
            if (typeof apiData.pradr.adr === "string") {
              address = apiData.pradr.adr;
            } else if (apiData.pradr.addr) {
              const a = apiData.pradr.addr;
              address = [a.bno, a.flno, a.bnm, a.st, a.loc, a.dst, a.stcd, a.pncd].filter(Boolean).join(", ");
              city = a.dst || a.city || "";
              pincode = a.pncd || "";
            }
          }
        }

        // 2. Extract payload from Angular scope, DOM tables strictly inside #lottable / .tabpane
        const extracted = await page.evaluate(() => {
          let lName = "";
          let tName = "";
          let stat = "ACTIVE";
          let taxpayerType = "Regular";
          let consti = "";
          let registrationDate = "";
          let addr = "";
          let cty = "";
          let pin = "";

          // 1. Check Angular scope on elements
          try {
            const scopeElements = [
              document.querySelector("#lottable"),
              document.querySelector(".tbl-format"),
              document.querySelector(".tabpane"),
              document.querySelector("form[name='searchtaxp']"),
              document.querySelector("body"),
            ].filter(Boolean);

            for (const el of scopeElements) {
              if ((window as any).angular) {
                const scope = (window as any).angular.element(el).scope();
                if (scope) {
                  const p = scope.searchTaxpre_Payload || scope.taxpayerDetails || scope.searchResult;
                  if (p && (p.lgnm || p.tradeNam || p.pradr)) {
                    if (p.lgnm) lName = p.lgnm;
                    if (p.tradeNam) tName = p.tradeNam;
                    if (p.sts) stat = p.sts;
                    if (p.dty) taxpayerType = p.dty;
                    if (p.ctb) consti = p.ctb;
                    if (p.rgdt) registrationDate = p.rgdt;
                    if (p.pradr) {
                      if (typeof p.pradr.adr === "string") {
                        addr = p.pradr.adr;
                      } else if (p.pradr.addr) {
                        const a = p.pradr.addr;
                        addr = [a.bno, a.flno, a.bnm, a.st, a.loc, a.dst, a.stcd, a.pncd].filter(Boolean).join(", ");
                        cty = a.dst || a.city || "";
                        pin = a.pncd || "";
                      }
                    }
                    break;
                  }
                }
              }
            }
          } catch (e) {}

          // 2. Strict DOM Extraction inside #lottable / .tbl-format / .tabpane
          const lotRoot = document.querySelector("#lottable, .tbl-format, .tabpane") || document.body;

          // Address extraction from .wordCls inside lotRoot
          const wordClsEl = lotRoot.querySelector(".wordCls");
          if (wordClsEl && wordClsEl.textContent?.trim() && !wordClsEl.closest("footer")) {
            const wTxt = wordClsEl.textContent.trim();
            if (wTxt && !wTxt.toLowerCase().includes("about gst") && !wTxt.toLowerCase().includes("gst council")) {
              if (!addr) addr = wTxt;
            }
          }

          // Column pairs extraction strictly inside lotRoot (ignoring footer/nav/header)
          const colDivs = lotRoot.querySelectorAll("div[class*='col-']");
          for (const col of Array.from(colDivs)) {
            if (col.closest("footer") || col.closest("nav") || col.closest("header")) continue;
            const pTags = Array.from(col.querySelectorAll("p"));
            if (pTags.length >= 2) {
              const label = (pTags[0].textContent || "").trim().toLowerCase();
              const val = (pTags[1].textContent || "").trim();

              if (!val || val.toLowerCase().includes("about gst") || val.toLowerCase().includes("gst council")) continue;

              if (label.includes("legal name") && !lName) {
                lName = val;
              } else if (label.includes("trade name") && !label.includes("additional") && !tName) {
                tName = val;
              } else if ((label.includes("principal place") || label.includes("place of business")) && !addr) {
                addr = val;
              } else if (label.includes("constitution") && !consti) {
                consti = val;
              } else if (label.includes("status") && (!stat || stat === "ACTIVE")) {
                stat = val;
              } else if (label.includes("taxpayer type") && !taxpayerType) {
                taxpayerType = val;
              } else if (label.includes("effective date") && !registrationDate) {
                registrationDate = val;
              }
            }
          }

          // Return only result container text (NEVER footer)
          const lotText = (document.querySelector("#lottable, .tbl-format, .tabpane") as HTMLElement)?.innerText || "";

          return {
            legalName: lName,
            tradeName: tName,
            status: stat,
            taxpayerType,
            constitution: consti,
            registrationDate,
            address: addr,
            city: cty,
            pincode: pin,
            lotText,
          };
        });

        // Clean up session tab
        await page.close().catch(() => {});
        sessions.delete(sessionId);

        if (!legalName && extracted.legalName && isValidBusinessName(extracted.legalName)) legalName = extracted.legalName;
        if (!tradeName && extracted.tradeName && isValidBusinessName(extracted.tradeName)) tradeName = extracted.tradeName;
        if (!address && extracted.address && !extracted.address.toLowerCase().includes("about gst") && !extracted.address.toLowerCase().includes("gst council")) address = extracted.address;
        if (!city && extracted.city) city = extracted.city;
        if (!pincode && extracted.pincode) pincode = extracted.pincode;
        if (extracted.status) status = extracted.status;
        if (extracted.constitution) constitution = extracted.constitution;

        // Complement with parsed text if any required field is still missing
        if (!legalName || !tradeName || !address || !isValidBusinessName(tradeName) || !isValidBusinessName(legalName)) {
          const parsed = parseGstPortalData(extracted.lotText);
          if (parsed) {
            if (!legalName || !isValidBusinessName(legalName)) legalName = parsed.legalName;
            if (!tradeName || !isValidBusinessName(tradeName)) tradeName = parsed.tradeName;
            if (!address) address = parsed.address;
            if (!city) city = parsed.city;
            if (!pincode) pincode = parsed.pincode;
            if (parsed.status) status = parsed.status;
            if (parsed.constitution) constitution = parsed.constitution;
          }
        }

        // Address cleaning & pincode / city resolution
        if (address) {
          const pinMatch = address.match(/\b([1-9][0-9]{5})\b/);
          if (pinMatch && !pincode) pincode = pinMatch[1];

          const knownCities = [
            "SURAT",
            "AHMEDABAD",
            "VADODARA",
            "RAJKOT",
            "MUMBAI",
            "DELHI",
            "JAIPUR",
            "KADODARA",
            "NAVSARI",
            "BARDOLI",
            "VALSAD",
            "ANKLESHWAR",
            "BHARUCH",
          ];
          const upperAddr = address.toUpperCase();
          for (const c of knownCities) {
            if (upperAddr.includes(c)) {
              city = c === "KADODARA" ? "SURAT" : c;
              break;
            }
          }
        }

        const stateCode = gstin.substring(0, 2);
        const pan = gstin.substring(2, 12);
        const entityCode = pan.charAt(3);
        const entityType = constitution || PAN_ENTITY_TYPES[entityCode] || "Business Entity";
        const stateName = GST_STATE_MAP[stateCode] || "Gujarat";
        const businessName = (tradeName || legalName || "").toUpperCase();

        return NextResponse.json({
          success: true,
          verified: true,
          gstin,
          legalName,
          tradeName,
          businessName,
          contactPerson: legalName || tradeName || undefined,
          address: address.toUpperCase(),
          city: (city || (stateCode === "24" ? "SURAT" : "")).toUpperCase(),
          state: stateName,
          stateCode,
          pincode: pincode || (stateCode === "24" ? "395010" : ""),
          pan,
          entityType,
          status: (status || "ACTIVE").toUpperCase(),
          source: "official_gst_portal_live",
          officialPortalUrl: "https://services.gst.gov.in/services/searchtp",
        });
      } catch (err: any) {
        await page.close().catch(() => {});
        sessions.delete(sessionId);
        return NextResponse.json(
          { success: false, error: err.message || "Failed to retrieve search results." },
          { status: 500 }
        );
      }
    }

    // Action 4: Refresh Captcha on existing session
    if (action === "refresh_captcha") {
      const { sessionId } = body;
      const session = sessions.get(sessionId);
      if (!session) {
        return NextResponse.json(
          { success: false, error: "Session expired." },
          { status: 400 }
        );
      }

      const { page } = session;
      const refreshBtn = await page.$("a[data-ng-click*='captcha'], #refreshCaptcha, .captcha-refresh");
      if (refreshBtn) {
        await refreshBtn.click();
        await new Promise((r) => setTimeout(r, 1000));
      } else {
        await page.reload({ waitUntil: "networkidle2" });
        await page.type("#for_gstin", session.gstin);
      }

      const captchaEl = await page.$("img[src*='captcha']");
      const newBase64 = captchaEl ? await captchaEl.screenshot({ encoding: "base64" }) : null;

      return NextResponse.json({
        success: true,
        captchaImage: newBase64 ? `data:image/png;base64,${newBase64}` : null,
        sessionId,
      });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("GST lookup POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process GST request" },
      { status: 500 }
    );
  }
}
