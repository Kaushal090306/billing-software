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
  const [isCloudMode, setIsCloudMode] = useState(false);
  const [pastedText, setPastedText] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const pasteAreaRef = useRef<HTMLTextAreaElement>(null);

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
      setIsCloudMode(false);
      setPastedText("");
    }
  }, [isOpen, gstin]);

  // Focus input when captcha appears or paste area in cloud mode
  useEffect(() => {
    if (captchaImage && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 80);
    } else if (isCloudMode && pasteAreaRef.current) {
      setTimeout(() => {
        pasteAreaRef.current?.focus();
      }, 100);
    }
  }, [captchaImage, isCloudMode]);

  const handleInitCaptcha = async (gstToUse: string) => {
    setIsLoadingCaptcha(true);
    setCaptchaImage(null);
    setSessionId(null);
    setErrorMessage(null);
    setCaptchaCode("");
    setIsCloudMode(false);
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
        setIsCloudMode(false);
      } else {
        setIsCloudMode(true);
        if (data.error && !data.isCloudMode) {
          setErrorMessage(data.error);
        }
      }
    } catch (err: any) {
      setIsCloudMode(true);
      setErrorMessage("Live cloud environment: Use 1-Click Portal Copy & Instant Paste below.");
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

  const handleParseTextDirect = async (textToParse: string) => {
    const raw = textToParse.trim();
    if (!raw) return;
    setIsVerifying(true);
    try {
      const res = await fetch("/api/gst-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "parse_text", rawText: raw, gstin: cleanGstin }),
      });
      const data = await res.json();
      if (data.success && data.verified) {
        onSuccess(data);
        toast.success(`✓ Official Details Extracted: ${data.tradeName || data.businessName || data.gstin}`);
        onClose();
      } else {
        toast.error(data.error || "Could not parse GST details from pasted text. Please paste the full table.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process pasted text");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClipboardRead = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setPastedText(text);
          handleParseTextDirect(text);
          return;
        }
      }
      toast.error("Please paste directly into the box using Ctrl+V");
    } catch {
      toast.error("Clipboard permission not granted. Please press Ctrl+V into the box.");
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
          {/* GSTIN Display & Quick Copy */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-border">
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase">
                Taxpayer GSTIN
              </div>
              <div className="font-mono font-black text-sm text-foreground tracking-wider">
                {cleanGstin || "NO GSTIN SPECIFIED"}
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenOfficialSite}
              className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold hover:underline flex items-center gap-1.5 cursor-pointer bg-white dark:bg-zinc-900 px-2.5 py-1.5 rounded-md border border-purple-200 dark:border-purple-700 shadow-2xs"
            >
              <Copy className="h-3 w-3 text-purple-600" />
              <span>Copy &amp; Open</span>
              <ExternalLink className="h-3 w-3 ml-0.5 text-muted-foreground" />
            </button>
          </div>

          {/* Loading State */}
          {isLoadingCaptcha && (
            <div className="py-8 flex flex-col items-center justify-center space-y-2 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-purple-600" />
              <div className="text-xs font-semibold text-foreground">
                Connecting to Official GST Portal...
              </div>
              <div className="text-[11px] text-muted-foreground">
                Connecting to services.gst.gov.in
              </div>
            </div>
          )}

          {/* 1. Live Captcha Entry Box (When browser automation is active) */}
          {!isLoadingCaptcha && captchaImage && !isCloudMode && (
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

              {/* Error message */}
              {errorMessage && (
                <div className="p-2 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-[11px] text-red-600 dark:text-red-300 flex items-center gap-1.5 font-medium">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errorMessage}</span>
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

          {/* 2. Cloud Mode / 1-Click Assisted Flow (When running in serverless cloud or browser is not on host) */}
          {!isLoadingCaptcha && (!captchaImage || isCloudMode) && (
            <div className="space-y-3">
              {/* Step 1: Open Portal */}
              <div className="p-3.5 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/30 rounded-xl border border-purple-200 dark:border-purple-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span>Live Verification from Official Portal</span>
                  </span>
                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-[10px] font-semibold border-0">
                    1-Click
                  </Badge>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Click below to copy <strong className="font-mono text-purple-900 dark:text-purple-300 font-bold">{cleanGstin}</strong> and open the official portal.
                </p>
                <Button
                  type="button"
                  onClick={handleOpenOfficialSite}
                  className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-2 shadow-xs cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>1. Open Official GST Portal (GSTIN Copied)</span>
                </Button>
              </div>

              {/* Step 2: Instant Auto-Extract & Paste Area */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ClipboardPaste className="h-4 w-4 text-purple-600" />
                    <span>2. Paste Portal Result Here</span>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClipboardRead}
                    className="h-7 px-2.5 text-[11px] font-semibold border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer"
                  >
                    <ClipboardPaste className="h-3 w-3 mr-1" />
                    <span>Paste Clipboard</span>
                  </Button>
                </div>

                <textarea
                  ref={pasteAreaRef}
                  rows={2}
                  value={pastedText}
                  onChange={(e) => {
                    setPastedText(e.target.value);
                    if (e.target.value.length > 20) {
                      handleParseTextDirect(e.target.value);
                    }
                  }}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData("text");
                    if (text) {
                      setPastedText(text);
                      handleParseTextDirect(text);
                    }
                  }}
                  placeholder="Copy text from official portal & press Ctrl+V here..."
                  className="w-full text-xs font-mono p-2.5 border rounded-lg bg-white dark:bg-zinc-900 border-purple-200 dark:border-purple-800 outline-none focus:ring-2 focus:ring-purple-500 resize-none placeholder:text-muted-foreground/60"
                  autoFocus
                />

                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="text-muted-foreground italic">
                    * Instantly auto-fills Trade Name, Legal Name &amp; Address.
                  </span>
                  {pastedText.trim() && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleParseTextDirect(pastedText)}
                      disabled={isVerifying}
                      className="h-7 px-3 text-xs bg-purple-600 text-white font-semibold cursor-pointer"
                    >
                      {isVerifying ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Extract Now"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
