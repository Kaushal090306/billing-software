"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ClipboardPaste,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface OfficialGstModalProps {
  isOpen: boolean;
  onClose: () => void;
  gstin: string;
  onSuccess: (customerData: {
    businessName: string;
    legalName?: string;
    tradeName?: string;
    contactPerson?: string;
    gstin: string;
    address?: string;
    city?: string;
    state?: string;
    stateCode?: string;
    pincode?: string;
    status?: string;
    pan?: string;
    entityType?: string;
  }) => void;
}

export function OfficialGstModal({
  isOpen,
  onClose,
  gstin,
  onSuccess,
}: OfficialGstModalProps) {
  const [cleanGstin, setCleanGstin] = useState(
    (gstin || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
  );
  const [captchaImage, setCaptchaImage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [captchaCode, setCaptchaCode] = useState("");
  const [isLoadingCaptcha, setIsLoadingCaptcha] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pastedText, setPastedText] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync GSTIN when prop changes or modal opens
  useEffect(() => {
    const clean = (gstin || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    setCleanGstin(clean);
    if (isOpen && clean.length === 15) {
      handleInitCaptcha(clean);
    } else if (!isOpen) {
      setCaptchaImage(null);
      setSessionId(null);
      setCaptchaCode("");
      setErrorMessage(null);
      setShowPasteBox(false);
      setPastedText("");
    }
  }, [isOpen, gstin]);

  // Focus input when captcha appears
  useEffect(() => {
    if (captchaImage && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 80);
    }
  }, [captchaImage]);

  // Auto-detect copied GST details when returning from official portal tab
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowFocus = async () => {
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (
            text &&
            (text.includes("Legal Name") ||
              text.includes("Trade Name") ||
              text.includes("Principal Place") ||
              text.includes("Constitution") ||
              text.includes("GSTIN / UIN") ||
              (cleanGstin && text.toUpperCase().includes(cleanGstin)))
          ) {
            const res = await fetch("/api/gst-lookup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "parse_text", rawText: text, gstin: cleanGstin }),
            });
            const data = await res.json();
            if (data.success && data.verified && (data.tradeName || data.legalName)) {
              onSuccess(data);
              toast.success(`✓ Official Details Auto-Captured from Clipboard: ${data.tradeName || data.businessName || data.gstin}`);
              onClose();
            }
          }
        }
      } catch (e) {
        // Clipboard read permission ignored
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    return () => window.removeEventListener("focus", handleWindowFocus);
  }, [isOpen, cleanGstin, onSuccess, onClose]);

  const handleDirectClipboardPaste = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 5) {
          setPastedText(text);
          const res = await fetch("/api/gst-lookup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "parse_text", rawText: text, gstin: cleanGstin }),
          });
          const data = await res.json();
          if (data.success && data.verified && (data.tradeName || data.legalName || data.businessName)) {
            onSuccess(data);
            toast.success(`✓ Official Details Extracted: ${data.tradeName || data.businessName || data.gstin}`);
            onClose();
            return;
          }
        }
      }
    } catch (e) {}
    setShowPasteBox(true);
  };

  const handleInitCaptcha = async (gstToUse: string) => {
    setIsLoadingCaptcha(true);
    setCaptchaImage(null);
    setSessionId(null);
    setErrorMessage(null);
    setCaptchaCode("");
    try {
      const res = await fetch("/api/gst-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "init", gstin: gstToUse }),
      });
      const data = await res.json();

      if (data.verified && !data.requiresCaptcha) {
        // Found in DB or pre-verified
        onSuccess(data);
        toast.success(`✓ Official GST Record Loaded: ${data.tradeName || data.businessName || data.gstin}`);
        onClose();
        return;
      }

      if (data.success && data.requiresCaptcha && data.captchaImage) {
        setCaptchaImage(data.captchaImage);
        setSessionId(data.sessionId);
      } else {
        setErrorMessage(data.error || "Official GST portal challenge requires browser verification.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to initialize official portal verification.");
    } finally {
      setIsLoadingCaptcha(false);
    }
  };

  const handleRefreshCaptcha = async () => {
    if (!sessionId) {
      handleInitCaptcha(cleanGstin);
      return;
    }
    setIsLoadingCaptcha(true);
    setErrorMessage(null);
    setCaptchaCode("");
    try {
      const res = await fetch("/api/gst-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh_captcha", sessionId }),
      });
      const data = await res.json();
      if (data.success && data.captchaImage) {
        setCaptchaImage(data.captchaImage);
      } else {
        handleInitCaptcha(cleanGstin);
      }
    } catch {
      handleInitCaptcha(cleanGstin);
    } finally {
      setIsLoadingCaptcha(false);
    }
  };

  const handleVerify = async (codeToUse?: string) => {
    const code = (codeToUse || captchaCode).trim();
    if (!code || code.length < 4) {
      setErrorMessage("Please enter the 6-character captcha code.");
      return;
    }
    if (!sessionId) {
      handleInitCaptcha(cleanGstin);
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/gst-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "solve",
          sessionId,
          captchaCode: code,
          gstin: cleanGstin,
        }),
      });
      const data = await res.json();

      if (data.success && data.verified) {
        onSuccess(data);
        toast.success(
          `✓ Verified from Official GST Portal: ${data.tradeName || data.businessName || data.gstin} (${data.status || "ACTIVE"})`
        );
        onClose();
      } else {
        setErrorMessage(data.error || "Incorrect captcha. Please re-enter.");
        if (data.captchaImage) {
          setCaptchaImage(data.captchaImage);
        } else if (data.error?.toLowerCase().includes("expired") || data.error?.toLowerCase().includes("session")) {
          handleInitCaptcha(cleanGstin);
        } else if (data.requiresPortalFallback) {
          setCaptchaImage(null);
        }
        setCaptchaCode("");
        setTimeout(() => inputRef.current?.focus(), 150);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCaptchaCodeChange = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setCaptchaCode(clean);
    if (clean.length === 6) {
      setTimeout(() => {
        handleVerify(clean);
      }, 50);
    }
  };

  const handleOpenOfficialSite = () => {
    if (cleanGstin && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(cleanGstin);
      toast.success(`Copied GSTIN (${cleanGstin}) to clipboard! Opening official portal...`);
    }
    window.open("https://services.gst.gov.in/services/searchtp", "_blank", "noopener,noreferrer");
  };

  const handleParsePastedText = async () => {
    if (!pastedText.trim()) {
      toast.error("Please paste text from official portal");
      return;
    }
    try {
      const res = await fetch("/api/gst-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "parse_text", rawText: pastedText, gstin: cleanGstin }),
      });
      const data = await res.json();
      if (data.success && data.verified) {
        onSuccess(data);
        toast.success(`✓ Official Details Extracted: ${data.tradeName || data.businessName || data.gstin}`);
        onClose();
      } else {
        toast.error(data.error || "Could not parse GST data from text");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process text");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white dark:bg-zinc-900 border border-purple-200 dark:border-purple-800/80 shadow-2xl p-5">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
              <span>Official GST Portal Live Verification</span>
            </DialogTitle>
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-mono text-[10px] border-purple-200 dark:border-purple-800">
              services.gst.gov.in
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Real-time taxpayer verification directly from Government of India GST database.
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* GSTIN Display & Quick Actions */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-border">
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                Taxpayer GSTIN
              </div>
              <div className="font-mono font-black text-sm text-foreground tracking-wider">
                {cleanGstin || "NO GSTIN SPECIFIED"}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleDirectClipboardPaste}
                className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold hover:underline flex items-center gap-1 cursor-pointer bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-md border border-emerald-300 dark:border-emerald-700 shadow-2xs"
                title="Paste copied GST details directly from clipboard"
              >
                <ClipboardPaste className="h-3 w-3 text-emerald-600" />
                <span>Paste</span>
              </button>
              <button
                type="button"
                onClick={handleOpenOfficialSite}
                className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold hover:underline flex items-center gap-1 cursor-pointer bg-white dark:bg-zinc-900 px-2.5 py-1.5 rounded-md border border-purple-200 dark:border-purple-700 shadow-2xs"
              >
                <Copy className="h-3 w-3 text-purple-600" />
                <span>Copy &amp; Open</span>
                <ExternalLink className="h-3 w-3 ml-0.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Loading State */}
          {isLoadingCaptcha && (
            <div className="py-8 flex flex-col items-center justify-center space-y-2 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-purple-600" />
              <div className="text-xs font-semibold text-foreground">
                Connecting to Official GST Portal...
              </div>
              <div className="text-[11px] text-muted-foreground">
                Fetching live security challenge from services.gst.gov.in
              </div>
            </div>
          )}

          {/* 1. Live Captcha Challenge (When available from gateway) */}
          {!isLoadingCaptcha && captchaImage && (
            <div className="p-3.5 bg-purple-50/50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Enter Characters Shown Below
                </span>
                <button
                  type="button"
                  onClick={handleRefreshCaptcha}
                  disabled={isLoadingCaptcha || isVerifying}
                  className="text-[11px] text-purple-600 dark:text-purple-400 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                  title="Reload new captcha image"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Refresh Code</span>
                </button>
              </div>

              {/* Captcha Image & Input Row */}
              <div className="flex items-center gap-3">
                <div className="bg-white p-1 rounded border-2 border-purple-300 dark:border-purple-700 shadow-xs shrink-0">
                  <img
                    src={captchaImage}
                    alt="Official GST Portal Captcha"
                    className="h-10 w-36 object-contain rounded"
                  />
                </div>
                <Input
                  ref={inputRef}
                  placeholder="Code"
                  maxLength={6}
                  value={captchaCode}
                  onChange={(e) => handleCaptchaCodeChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && captchaCode.length >= 4) {
                      e.preventDefault();
                      handleVerify();
                    }
                  }}
                  className="h-11 font-mono font-black text-base text-center tracking-widest uppercase border-purple-400 dark:border-purple-600 bg-white dark:bg-zinc-900"
                />
              </div>

              {/* Error message with Fast Recovery Actions */}
              {errorMessage && (
                <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200 space-y-2 font-medium">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                    <span>{errorMessage}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-amber-200/80 dark:border-amber-800/80">
                    <button
                      type="button"
                      onClick={handleRefreshCaptcha}
                      className="text-[10px] text-purple-700 dark:text-purple-300 bg-white dark:bg-zinc-900 px-2 py-1 rounded border border-purple-200 font-semibold cursor-pointer"
                    >
                      🔄 Reload Captcha
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenOfficialSite}
                      className="text-[10px] text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-950/70 px-2 py-1 rounded border border-purple-300 font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                      <span>Open Portal Directly</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="button"
                onClick={() => handleVerify()}
                disabled={isVerifying || captchaCode.trim().length < 4}
                className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5 shadow-md cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying on Official GST Portal...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Verify &amp; Auto-Fill Customer Details</span>
                  </>
                )}
              </Button>
            </div>
          )}

          {/* 2. Direct Official Verification Guide (When gateway captcha is bypassed or unavailable) */}
          {!isLoadingCaptcha && !captchaImage && (
            <div className="p-4 bg-gradient-to-br from-purple-50/80 to-indigo-50/50 dark:from-purple-950/30 dark:to-zinc-900/60 rounded-xl border border-purple-200 dark:border-purple-800 space-y-3.5 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span>Instant Official Portal Auto-Fill</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    GSTIN is already copied. Complete in 3 simple steps:
                  </p>
                </div>
                <Badge variant="outline" className="text-[9px] font-semibold text-purple-600 border-purple-300 bg-white dark:bg-zinc-900">
                  100% Guaranteed
                </Badge>
              </div>

              {/* 3 Step Visual Guide */}
              <div className="space-y-2 text-[11px] bg-white dark:bg-zinc-900/80 p-3 rounded-lg border border-purple-100 dark:border-purple-900/40">
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full bg-purple-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">1</span>
                  <span>Click <b>Open Official Portal</b> (GSTIN auto-copied to clipboard)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full bg-purple-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">2</span>
                  <span>Paste GSTIN, solve captcha &amp; <b>Copy the result table</b></span>
                </div>
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
                  <span className="h-4 w-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">3</span>
                  <span><b>Switch back here</b> — Details will auto-populate instantly!</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleOpenOfficialSite}
                  className="flex-1 h-10 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5 shadow-md cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>1. Open Official GST Portal</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDirectClipboardPaste}
                  className="h-10 text-xs font-bold gap-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 cursor-pointer shadow-2xs"
                >
                  <ClipboardPaste className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Paste Copied</span>
                </Button>
              </div>
            </div>
          )}

          {/* Quick Paste Box (Collapsible / Manual fallback) */}
          <div className="border-t border-border pt-2.5">
            <button
              type="button"
              onClick={() => setShowPasteBox(!showPasteBox)}
              className="text-[11px] text-muted-foreground hover:text-purple-600 font-medium flex items-center justify-between w-full cursor-pointer"
            >
              <span>Or paste details directly into text box:</span>
              <span className="text-purple-600 font-semibold">
                {showPasteBox ? "Hide" : "Paste Tool"}
              </span>
            </button>

            {showPasteBox && (
              <div className="mt-2 space-y-2 p-2.5 rounded bg-zinc-50 dark:bg-zinc-800/60 border border-border">
                <textarea
                  rows={2}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste copied table text from services.gst.gov.in..."
                  className="w-full text-xs font-mono p-2 border rounded bg-white dark:bg-zinc-900 outline-none resize-none"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleParsePastedText}
                    disabled={!pastedText.trim()}
                    className="h-7 text-xs bg-purple-600 text-white cursor-pointer"
                  >
                    Extract &amp; Fill
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
