"use client";

import React, { forwardRef, useState, useRef, useEffect } from "react";
import {
  Invoice,
  BusinessSettings,
  InvoiceTemplateConfig,
  InvoiceSectionId,
  InvoiceTemplateSection,
  InvoiceElementStyle,
  INVOICE_ELEMENTS,
  defaultInvoiceTemplates,
  getFontFamilyCSS,
  getElementEffectiveFontSize,
} from "@/lib/store";
import { formatNumber } from "@/lib/billing-utils";
import {
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Sliders,
  Image as ImageIcon,
  QrCode,
  PenTool,
  Check,
  X,
  Upload,
  Trash2,
  Plus,
  Type,
  Maximize2,
  Minimize2,
  GripVertical,
} from "lucide-react";

interface InvoiceTemplateProps {
  invoice: Invoice;
  settings: BusinessSettings;
  templateConfig?: InvoiceTemplateConfig;
  copyType?: "Original" | "Duplicate" | "Triplicate";
  onSectionClick?: (sectionId: InvoiceSectionId) => void;
  hoveredSectionId?: string | null;
  selectedElementKey?: string | null;
  onSelectElement?: (elementKey: string | null) => void;
  interactive?: boolean;
  onUpdateSettings?: (updates: Partial<BusinessSettings>) => void;
  onUpdateTemplate?: (updates: Partial<InvoiceTemplateConfig>) => void;
  onUpdateElementStyle?: (
    elementKey: string,
    styleUpdates: Partial<InvoiceElementStyle>
  ) => void;
  onResetElementStyle?: (elementKey: string) => void;
  onMoveSection?: (sectionId: InvoiceSectionId, direction: "up" | "down") => void;
  onToggleSection?: (sectionId: InvoiceSectionId) => void;
  onUpdateSectionPadding?: (
    sectionId: InvoiceSectionId,
    padding: "compact" | "normal" | "spacious"
  ) => void;
  onUpdateSectionHeight?: (
    sectionId: InvoiceSectionId,
    heightPx: number
  ) => void;
}

// ---------------------------------------------------------------------------
// INLINE FLOATING QUICK FORMAT BAR FOR SELECTED ELEMENT
// ---------------------------------------------------------------------------
function ElementFormatBar({
  elementKey,
  elementLabel,
  currentStyle,
  defaultFontSize,
  onUpdateStyle,
  onResetStyle,
  onClose,
  targetElementRef,
}: {
  elementKey: string;
  elementLabel: string;
  currentStyle?: InvoiceElementStyle;
  defaultFontSize: number;
  onUpdateStyle: (updates: Partial<InvoiceElementStyle>) => void;
  onResetStyle: () => void;
  onClose: () => void;
  targetElementRef?: React.RefObject<HTMLSpanElement | null>;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<"top" | "bottom">("top");
  const [alignment, setAlignment] = useState<"center" | "left" | "right">("center");

  // Determine smart placement: if near top of viewport/container, place bottom
  useEffect(() => {
    if (targetElementRef?.current) {
      const rect = targetElementRef.current.getBoundingClientRect();
      // If the element is within top 110px of the viewport, place format bar below it
      if (rect.top < 110) {
        setPlacement("bottom");
      } else {
        setPlacement("top");
      }

      // Horizontal edge safety
      if (rect.left < 150) {
        setAlignment("left");
      } else if (typeof window !== "undefined" && window.innerWidth - rect.right < 150) {
        setAlignment("right");
      } else {
        setAlignment("center");
      }
    }
  }, [targetElementRef]);

  // Close when clicking anywhere outside the menu and target element
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (!target) return;
      if (barRef.current && barRef.current.contains(target)) {
        return; // Inside the menu
      }
      if (targetElementRef?.current && targetElementRef.current.contains(target)) {
        return; // Inside the editable element
      }
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Listen on document
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, targetElementRef]);

  const currentFontSize =
    currentStyle?.fontSizePx !== undefined
      ? currentStyle.fontSizePx
      : defaultFontSize;

  const isBold =
    currentStyle?.fontWeight === "bold" ||
    currentStyle?.fontWeight === "700" ||
    currentStyle?.fontWeight === "900";

  const isItalic = currentStyle?.fontStyle === "italic";
  const isUnderline = currentStyle?.textDecoration === "underline";
  const isUppercase = currentStyle?.textTransform === "uppercase";

  const colorPalette = [
    "#000000",
    "#4f46e5",
    "#0f766e",
    "#831843",
    "#b45309",
    "#1e293b",
    "#dc2626",
    "#2563eb",
  ];

  const posClasses =
    placement === "bottom"
      ? "top-full mt-2 flex-col-reverse"
      : "bottom-full mb-2 flex-col";

  const alignClasses =
    alignment === "left"
      ? "left-0 translate-x-0 items-start"
      : alignment === "right"
      ? "right-0 translate-x-0 items-end"
      : "left-1/2 -translate-x-1/2 items-center";

  const arrowAlignClasses =
    alignment === "left"
      ? "ml-4"
      : alignment === "right"
      ? "mr-4"
      : "";

  return (
    <div
      ref={barRef}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={`absolute z-[100] flex select-none animate-in fade-in zoom-in-95 duration-100 ${posClasses} ${alignClasses}`}
    >
      <div className="flex items-center gap-1.5 bg-zinc-900/95 backdrop-blur-md text-white rounded-lg shadow-2xl p-1.5 px-2.5 text-xs whitespace-nowrap border border-zinc-700 ring-1 ring-black/40">
        <span className="font-bold text-purple-300 mr-1 max-w-[130px] truncate text-[11px] tracking-tight">
          {elementLabel}
        </span>

        {/* Font Size A- / A+ */}
        <div className="flex items-center bg-zinc-800 rounded-md px-1.5 py-0.5 gap-1 border border-zinc-700">
          <button
            type="button"
            onClick={() => {
              const newSize = Math.max(
                6,
                Math.round((currentFontSize - 0.5) * 10) / 10
              );
              onUpdateStyle({ fontSizePx: newSize });
            }}
            title="Decrease Font Size (A-)"
            className="px-1.5 py-0.5 hover:bg-zinc-700 rounded text-xs font-bold text-zinc-200 transition-colors cursor-pointer"
          >
            A-
          </button>
          <span className="font-mono text-purple-400 font-bold min-w-[34px] text-center text-xs">
            {currentFontSize.toFixed(1)}px
          </span>
          <button
            type="button"
            onClick={() => {
              const newSize = Math.min(
                32,
                Math.round((currentFontSize + 0.5) * 10) / 10
              );
              onUpdateStyle({ fontSizePx: newSize });
            }}
            title="Increase Font Size (A+)"
            className="px-1.5 py-0.5 hover:bg-zinc-700 rounded text-xs font-bold text-zinc-200 transition-colors cursor-pointer"
          >
            A+
          </button>
        </div>

        {/* Font Family Dropdown */}
        <select
          value={currentStyle?.fontFamily || ""}
          onChange={(e) =>
            onUpdateStyle({ fontFamily: e.target.value || undefined })
          }
          className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-200 outline-none cursor-pointer h-7 font-medium hover:border-zinc-500 transition-colors"
        >
          <option value="">(Inherit Font)</option>
          <option value="Plus Jakarta Sans">Jakarta Sans</option>
          <option value="Inter">Inter</option>
          <option value="Roboto">Roboto</option>
          <option value="Outfit">Outfit</option>
          <option value="Poppins">Poppins</option>
          <option value="serif">Serif (Georgia)</option>
          <option value="mono">Monospace</option>
          <option value="Cinzel">Cinzel</option>
          <option value="'Brush Script MT', cursive, sans-serif">
            Brush Script
          </option>
        </select>

        {/* Bold Toggle */}
        <button
          type="button"
          onClick={() =>
            onUpdateStyle({ fontWeight: isBold ? "normal" : "bold" })
          }
          title="Toggle Bold"
          className={`h-7 min-w-[26px] px-2 py-1 rounded-md text-xs font-black cursor-pointer transition-colors flex items-center justify-center ${
            isBold
              ? "bg-purple-600 text-white shadow-sm"
              : "hover:bg-zinc-800 text-zinc-300"
          }`}
        >
          B
        </button>

        {/* Italic Toggle */}
        <button
          type="button"
          onClick={() =>
            onUpdateStyle({ fontStyle: isItalic ? "normal" : "italic" })
          }
          title="Toggle Italic"
          className={`h-7 min-w-[26px] px-2 py-1 rounded-md text-xs italic font-serif cursor-pointer transition-colors flex items-center justify-center ${
            isItalic
              ? "bg-purple-600 text-white shadow-sm"
              : "hover:bg-zinc-800 text-zinc-300"
          }`}
        >
          I
        </button>

        {/* Underline Toggle */}
        <button
          type="button"
          onClick={() =>
            onUpdateStyle({
              textDecoration: isUnderline ? "none" : "underline",
            })
          }
          title="Toggle Underline"
          className={`h-7 min-w-[26px] px-2 py-1 rounded-md text-xs underline font-semibold cursor-pointer transition-colors flex items-center justify-center ${
            isUnderline
              ? "bg-purple-600 text-white shadow-sm"
              : "hover:bg-zinc-800 text-zinc-300"
          }`}
        >
          U
        </button>

        {/* Uppercase Toggle */}
        <button
          type="button"
          onClick={() =>
            onUpdateStyle({
              textTransform: isUppercase ? "none" : "uppercase",
            })
          }
          title="Toggle Uppercase"
          className={`h-7 min-w-[26px] px-1.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors flex items-center justify-center ${
            isUppercase
              ? "bg-purple-600 text-white shadow-sm"
              : "hover:bg-zinc-800 text-zinc-300"
          }`}
        >
          TT
        </button>

        {/* Color Palette */}
        <div className="flex items-center gap-1 pl-1">
          {colorPalette.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onUpdateStyle({ color: c })}
              title={c}
              className={`h-4 w-4 rounded-full border border-white/20 transition-transform cursor-pointer ${
                currentStyle?.color === c
                  ? "scale-125 ring-2 ring-purple-400 ring-offset-1 ring-offset-zinc-900"
                  : "hover:scale-115 opacity-80 hover:opacity-100"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Reset button if styled */}
        {currentStyle && Object.keys(currentStyle).length > 0 && (
          <button
            type="button"
            onClick={onResetStyle}
            title="Reset Element Styling"
            className="h-7 px-2 py-1 rounded-md text-amber-400 hover:bg-zinc-800 text-[11px] font-medium cursor-pointer transition-colors border border-amber-400/20 ml-0.5"
          >
            Reset
          </button>
        )}

        {/* Close / Deselect */}
        <button
          type="button"
          onClick={onClose}
          title="Deselect"
          className="h-7 w-7 flex items-center justify-center hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white cursor-pointer ml-0.5 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Dynamic Arrow pointing to the selected element */}
      {placement === "bottom" ? (
        <div className={`w-0 h-0 border-x-[5px] border-x-transparent border-b-[5px] border-b-zinc-900 -mb-px ${arrowAlignClasses}`}></div>
      ) : (
        <div className={`w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-zinc-900 -mt-px ${arrowAlignClasses}`}></div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TRUE NATIVE WYSIWYG EDITABLE TEXT (contentEditable) WITH PER-ELEMENT STYLING
// ---------------------------------------------------------------------------
function EditableText({
  value,
  onSave,
  interactive = false,
  className = "",
  style,
  placeholder = "",
  uppercase = false,
  singleLine = true,
  tooltip,
  elementKey,
  elementLabel,
  defaultFontSizePx,
  customStyles,
  selectedElementKey,
  onSelectElement,
  onUpdateElementStyle,
  onResetElementStyle,
}: {
  value: string;
  onSave?: (val: string) => void;
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  uppercase?: boolean;
  singleLine?: boolean;
  tooltip?: string;
  elementKey?: string;
  elementLabel?: string;
  defaultFontSizePx?: number;
  customStyles?: Record<string, InvoiceElementStyle>;
  selectedElementKey?: string | null;
  onSelectElement?: (key: string | null) => void;
  onUpdateElementStyle?: (
    elementKey: string,
    styleUpdates: Partial<InvoiceElementStyle>
  ) => void;
  onResetElementStyle?: (elementKey: string) => void;
}) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const isSelected = Boolean(
    interactive && elementKey && selectedElementKey === elementKey
  );
  const custom =
    elementKey && customStyles ? customStyles[elementKey] : undefined;

  // Sync value to DOM when not focused
  useEffect(() => {
    if (elementRef.current && document.activeElement !== elementRef.current) {
      elementRef.current.innerText = value || "";
    }
  }, [value]);

  const effectiveStyle: React.CSSProperties = {
    ...style,
    fontSize:
      custom?.fontSizePx !== undefined
        ? `${custom.fontSizePx}px`
        : style?.fontSize,
    fontFamily: custom?.fontFamily
      ? getFontFamilyCSS(custom.fontFamily)
      : style?.fontFamily,
    fontWeight:
      custom?.fontWeight !== undefined
        ? custom.fontWeight
        : style?.fontWeight,
    fontStyle:
      custom?.fontStyle !== undefined ? custom.fontStyle : style?.fontStyle,
    textDecoration:
      custom?.textDecoration !== undefined
        ? custom.textDecoration
        : style?.textDecoration,
    textTransform:
      custom?.textTransform !== undefined
        ? (custom.textTransform as any)
        : uppercase
        ? "uppercase"
        : style?.textTransform,
    color: custom?.color !== undefined ? custom.color : style?.color,
    letterSpacing:
      custom?.letterSpacing !== undefined
        ? custom.letterSpacing
        : style?.letterSpacing,
  };

  if (!interactive) {
    return (
      <span className={className} style={effectiveStyle}>
        {value || placeholder}
      </span>
    );
  }

  const handleBlur = (e: React.FocusEvent<HTMLSpanElement>) => {
    let text = e.currentTarget.innerText || "";
    if (uppercase || custom?.textTransform === "uppercase") {
      text = text.toUpperCase();
    }
    text = text.trim();
    if (text !== (value || "").trim() && onSave) {
      onSave(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (singleLine && e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    if (elementKey) {
      onSelectElement?.(elementKey);
    }
  };

  const handleFocus = () => {
    if (elementKey) {
      onSelectElement?.(elementKey);
    }
  };

  return (
    <span className="relative inline-flex items-center">
      {isSelected && elementKey && onUpdateElementStyle && (
        <ElementFormatBar
          elementKey={elementKey}
          elementLabel={elementLabel || elementKey}
          currentStyle={custom}
          defaultFontSize={defaultFontSizePx || 9.5}
          onUpdateStyle={(updates) => onUpdateElementStyle(elementKey, updates)}
          onResetStyle={() => onResetElementStyle?.(elementKey)}
          onClose={() => onSelectElement?.(null)}
          targetElementRef={elementRef}
        />
      )}
      <span
        ref={elementRef}
        contentEditable={true}
        suppressContentEditableWarning={true}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onFocus={handleFocus}
        onMouseDown={(e) => e.stopPropagation()}
        title={tooltip || "Click to edit text and customize style"}
        className={`outline-none transition-all rounded-xs cursor-text inline-block min-w-[20px] ${
          isSelected
            ? "ring-2 ring-purple-600 bg-purple-100/70 dark:bg-purple-900/60 shadow-xs z-10"
            : "focus:ring-2 focus:ring-purple-600 focus:bg-purple-50 dark:focus:bg-purple-950/80 hover:ring-1 hover:ring-purple-400 hover:bg-purple-50/40"
        } ${
          uppercase || custom?.textTransform === "uppercase" ? "uppercase" : ""
        } ${className}`}
        style={effectiveStyle}
      >
        {value || placeholder}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// MAIN INVOICE TEMPLATE COMPONENT
// ---------------------------------------------------------------------------
export const InvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  (
    {
      invoice,
      settings,
      templateConfig,
      copyType = "Original",
      onSectionClick,
      hoveredSectionId,
      selectedElementKey,
      onSelectElement,
      interactive = false,
      onUpdateSettings,
      onUpdateTemplate,
      onUpdateElementStyle,
      onResetElementStyle,
      onMoveSection,
      onToggleSection,
      onUpdateSectionPadding,
      onUpdateSectionHeight,
    },
    ref
  ) => {
    // Resolve template config with fallback to default
    const template: InvoiceTemplateConfig =
      templateConfig ||
      settings.templates?.find((t) => t.id === settings.activeTemplateId) ||
      defaultInvoiceTemplates[0];

    // Internal selection fallback if not controlled externally
    const [internalSelectedElement, setInternalSelectedElement] =
      useState<string | null>(null);

    const activeSelectedElementKey =
      selectedElementKey !== undefined
        ? selectedElementKey
        : internalSelectedElement;

    const handleSelectElement = (key: string | null) => {
      setInternalSelectedElement(key);
      onSelectElement?.(key);
    };

    const handleUpdateElementStyle = (
      elementKey: string,
      styleUpdates: Partial<InvoiceElementStyle>
    ) => {
      if (onUpdateElementStyle) {
        onUpdateElementStyle(elementKey, styleUpdates);
      } else if (onUpdateTemplate) {
        const currentStyles = template.customStyles || {};
        const updatedStyles: Record<string, InvoiceElementStyle> = {
          ...currentStyles,
          [elementKey]: {
            ...(currentStyles[elementKey] || {}),
            ...styleUpdates,
          },
        };
        onUpdateTemplate({ customStyles: updatedStyles });
      }
    };

    const handleResetElementStyle = (elementKey: string) => {
      if (onResetElementStyle) {
        onResetElementStyle(elementKey);
      } else if (onUpdateTemplate) {
        const currentStyles = { ...(template.customStyles || {}) };
        delete currentStyles[elementKey];
        onUpdateTemplate({ customStyles: currentStyles });
      }
    };

    // Modals / Popovers for In-Preview Customization
    const [activePopover, setActivePopover] = useState<
      "logo" | "qr" | "signature" | null
    >(null);

    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const logoInputRef = useRef<HTMLInputElement>(null);
    const sigInputRef = useRef<HTMLInputElement>(null);
    const qrInputRef = useRef<HTMLInputElement>(null);

    const isInterstate =
      Boolean(invoice.customerStateCode) &&
      Boolean(settings.stateCode) &&
      invoice.customerStateCode !== settings.stateCode;

    // Supplier details from reactive settings
    const companyTitle = settings.companyName || "SHREE MANGALAM THREAD & JARI";
    const companyAddress =
      settings.address || "SHOP NO.1,JAY NARAYAN IND.-1,ANJANA FARM,SURAT.";
    const companyGstin = settings.gstin || "24AEYPV3370E1Z1";
    const companyMobile1 = settings.phone || "97235 44545";
    const companyMobile2 = settings.phoneAlt || "98248 55454";
    const devotionalHeader =
      settings.devotionalHeader || "ll SHREE GANESHAY NAMAH ll";

    // Logo configuration
    const logoType = settings.logoType || "monogram";
    const logoUrl = settings.logoUrl;
    const logoSize = settings.logoSize || "medium";
    const monogramText = settings.monogramText || "SMJ";
    const monogramSubtext = settings.monogramSubtext || "THREAD & JARI";

    // Signature configuration
    const signatureType = settings.signatureType || "font";
    const signatureUrl = settings.signatureUrl;
    const signatureFont =
      settings.signatureFont || "'Brush Script MT', cursive, sans-serif";
    const signatoryName = settings.authorizedSignatoryName || "Ketan";
    const signatoryFirmTitle =
      settings.signatoryFirmTitle || `For ${companyTitle}`;
    const signatoryLabel =
      settings.signatoryLabel || "(Authorised Signatory)";

    // QR Code configuration
    const showQrCode = template.showQrCode && settings.showQrCode !== false;
    const qrCodeType = settings.qrCodeType || "auto";
    const qrCodeUrl = settings.qrCodeUrl;
    const upiId = settings.upiId || "9723544545@okbizaxis";

    // Dynamic Base Font Size in PX
    const baseFontSizePx =
      template.fontSizePx ||
      (template.fontSize === "compact"
        ? 8.5
        : template.fontSize === "large"
        ? 11
        : 9.5);

    // Border styling
    const containerBorderClass =
      template.borderStyle === "double-border"
        ? "border-4 border-double"
        : template.borderStyle === "minimal-border"
        ? "border"
        : template.borderStyle === "borderless-modern"
        ? "border border-zinc-300 shadow-sm"
        : "border-2";

    const borderColor = template.themeColor || "#000000";

    // Dynamic Font Family
    const fontFamilyStyle = getFontFamilyCSS(template.fontFamily) || "'Plus Jakarta Sans', Arial, Helvetica, sans-serif";

    // Dynamic spacer calculation to fill middle section cleanly
    const minRows =
      template.tableDensity === "compact"
        ? 22
        : template.tableDensity === "spacious"
        ? 14
        : 18;
    const emptyRowsCount = Math.max(0, minRows - (invoice.items?.length || 0));

    // Custom fields grouped by placement
    const customFields = template.customFields || [];
    const headerRightFields = customFields.filter(
      (f) => f.placement === "header_right"
    );
    const receiverFields = customFields.filter(
      (f) => f.placement === "receiver_box"
    );
    const footerLeftFields = customFields.filter(
      (f) => f.placement === "footer_left"
    );
    const footerRightFields = customFields.filter(
      (f) => f.placement === "footer_right"
    );

    // Helpers for file uploads directly in preview
    const handleFileUpload = (
      e: React.ChangeEvent<HTMLInputElement>,
      field: "logoUrl" | "signatureUrl" | "qrCodeUrl"
    ) => {
      const file = e.target.files?.[0];
      if (file && onUpdateSettings) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          if (field === "logoUrl") {
            onUpdateSettings({ logoUrl: result, logoType: "image" });
          } else if (field === "signatureUrl") {
            onUpdateSettings({ signatureUrl: result, signatureType: "image" });
          } else if (field === "qrCodeUrl") {
            onUpdateSettings({ qrCodeUrl: result, qrCodeType: "custom" });
          }
        };
        reader.readAsDataURL(file);
      }
    };

    // Divider Line Drag-to-Resize Handler
    const startSectionResize = (
      e: React.MouseEvent,
      sectionId: InvoiceSectionId
    ) => {
      e.preventDefault();
      e.stopPropagation();
      const el = sectionRefs.current[sectionId];
      const initialHeight = el ? el.getBoundingClientRect().height : 40;
      const startY = e.clientY;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        const delta = moveEvent.clientY - startY;
        const newHeight = Math.max(22, Math.round(initialHeight + delta));
        onUpdateSectionHeight?.(sectionId, newHeight);
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    };

    // Section wrapper with automatic vertical centering and shared joint divider line
    const renderSectionWrapper = (
      sectionId: InvoiceSectionId,
      sectionName: string,
      content: React.ReactNode,
      showBottomResizeHandle = true
    ) => {
      const isHovered = hoveredSectionId === sectionId;
      const secConfig = template.sectionsOrder?.find((s) => s.id === sectionId);
      const customHeight = secConfig?.heightPx || secConfig?.minHeightPx;
      const currentIndex = (template.sectionsOrder || []).findIndex(
        (s) => s.id === sectionId
      );
      const totalSections = (template.sectionsOrder || []).length;

      return (
        <div
          key={sectionId}
          ref={(el) => {
            sectionRefs.current[sectionId] = el;
          }}
          style={customHeight ? { minHeight: `${customHeight}px` } : undefined}
          className={`relative flex flex-col justify-center transition-all group/sec ${
            interactive
              ? "hover:ring-1 hover:ring-purple-400 hover:bg-purple-50/5"
              : ""
          } ${
            isHovered && interactive
              ? "ring-2 ring-purple-600 bg-purple-50/15"
              : ""
          }`}
        >
          {/* Inner Section Content (Stretches full height and centers automatically) */}
          <div className="w-full h-full flex flex-col justify-center flex-1">
            {content}
          </div>

          {/* Floating Section Actions in the Outer Right Margin */}
          {interactive && (
            <div className="absolute top-1/2 -translate-y-1/2 -right-8.5 opacity-0 group-hover/sec:opacity-100 transition-opacity flex flex-col items-center gap-1 bg-zinc-900 text-white rounded p-1 shadow-2xl z-30 pointer-events-auto text-[9px]">
              {/* Move Up */}
              <button
                type="button"
                disabled={currentIndex <= 0}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveSection?.(sectionId, "up");
                }}
                title="Move Section Up"
                className="p-1 rounded hover:bg-zinc-700 disabled:opacity-25 cursor-pointer text-zinc-200"
              >
                <ArrowUp className="h-3 w-3" />
              </button>

              {/* Move Down */}
              <button
                type="button"
                disabled={currentIndex >= totalSections - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveSection?.(sectionId, "down");
                }}
                title="Move Section Down"
                className="p-1 rounded hover:bg-zinc-700 disabled:opacity-25 cursor-pointer text-zinc-200"
              >
                <ArrowDown className="h-3 w-3" />
              </button>

              {/* Hide Section */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSection?.(sectionId);
                }}
                title="Hide this Section"
                className="p-1 rounded hover:bg-red-900 text-red-400 cursor-pointer"
              >
                <EyeOff className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Interactive Shared Joint Dividing Line */}
          {interactive && showBottomResizeHandle && (
            <div
              onMouseDown={(e) => startSectionResize(e, sectionId)}
              title="Drag dividing joint line up or down"
              className="absolute -bottom-1 left-0 right-0 h-2.5 z-20 cursor-row-resize flex items-center justify-center opacity-0 group-hover/sec:opacity-100 hover:!opacity-100 transition-opacity"
            >
              <div className="w-full h-0.5 bg-purple-500 shadow-xs flex items-center justify-center">
                <div className="bg-purple-700 text-white rounded-full px-1.5 py-0.2 text-[7px] font-mono font-bold flex items-center gap-0.5 shadow-sm select-none">
                  <GripVertical className="h-2 w-2 rotate-90" />
                  <span>Resize joint</span>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };

    // Helper to render editable text with per-element styling
    const renderET = (
      elementKey: string,
      elementLabel: string,
      value: string,
      onSave?: (val: string) => void,
      options?: {
        defaultFontSizePx?: number;
        className?: string;
        style?: React.CSSProperties;
        placeholder?: string;
        uppercase?: boolean;
        singleLine?: boolean;
        tooltip?: string;
      }
    ) => (
      <EditableText
        elementKey={elementKey}
        elementLabel={elementLabel}
        value={value}
        onSave={onSave}
        interactive={interactive}
        defaultFontSizePx={options?.defaultFontSizePx}
        className={options?.className}
        style={options?.style}
        placeholder={options?.placeholder}
        uppercase={options?.uppercase}
        singleLine={options?.singleLine}
        tooltip={options?.tooltip}
        customStyles={template.customStyles}
        selectedElementKey={activeSelectedElementKey}
        onSelectElement={handleSelectElement}
        onUpdateElementStyle={handleUpdateElementStyle}
        onResetElementStyle={handleResetElementStyle}
      />
    );

    // =========================================================================
    // 1. DEVOTIONAL HEADER & PHONE NUMBERS
    // =========================================================================
    const renderDevotionalHeader = () => {
      if (!template.showDevotionalHeader) return null;
      return renderSectionWrapper(
        "devotional",
        "Devotional & Mobile",
        <div
          className="w-full h-full flex justify-between items-center text-[0.95em] font-bold border-b px-3 py-2 min-h-[34px]"
          style={{ borderColor }}
        >
          <div className="w-1/4"></div>
          <div className="w-2/4 text-center tracking-widest uppercase text-[1.05em]">
            {renderET(
              "devotional_header",
              "Devotional Header",
              devotionalHeader,
              (val) => onUpdateSettings?.({ devotionalHeader: val }),
              {
                defaultFontSizePx: 10.0,
                uppercase: true,
                tooltip: "Click to edit devotional header text",
              }
            )}
          </div>
          <div className="w-1/4 text-right leading-tight text-[0.9em] font-bold">
            <div>
              Mo.{" "}
              {renderET(
                "company_phones",
                "Header Mobile 1",
                companyMobile1,
                (val) => onUpdateSettings?.({ phone: val }),
                {
                  defaultFontSizePx: 9.5,
                  tooltip: "Click to edit primary mobile number",
                }
              )}
            </div>
            {companyMobile2 && (
              <div className="mt-0.5">
                {renderET(
                  "company_phones",
                  "Header Mobile 2",
                  companyMobile2,
                  (val) => onUpdateSettings?.({ phoneAlt: val }),
                  {
                    defaultFontSizePx: 9.5,
                    tooltip: "Click to edit alternate mobile number",
                  }
                )}
              </div>
            )}
          </div>
        </div>
      );
    };

    // =========================================================================
    // 2. BRAND HEADER (LOGO, FIRM NAME, ADDRESS, GSTIN, QR CODE)
    // =========================================================================
    const renderBrandHeader = () => {
      const logoDimensionClass =
        logoSize === "small"
          ? "w-16 h-14"
          : logoSize === "large"
          ? "w-24 h-22"
          : "w-20 h-18";

      return renderSectionWrapper(
        "brand_header",
        "Company Header & Logo",
        <div
          className="w-full h-full flex items-center justify-between border-b-2 px-3 py-3.5 sm:py-4.5 min-h-[105px]"
          style={{ borderColor }}
        >
          {/* Left: Dynamic Company Logo or Monogram */}
          <div className="relative shrink-0 flex items-center justify-start">
            <div
              onClick={() => interactive && setActivePopover("logo")}
              className={`relative ${
                interactive
                  ? "cursor-pointer group/logo rounded p-0.5 hover:ring-2 hover:ring-purple-500 transition-all"
                  : ""
              }`}
            >
              {logoType === "image" && logoUrl ? (
                <div
                  className={`border p-0.5 rounded bg-white flex items-center justify-center overflow-hidden ${logoDimensionClass}`}
                  style={{ borderColor }}
                >
                  <img
                    src={logoUrl}
                    alt={companyTitle}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : logoType !== "none" ? (
                <div
                  className="border px-2 py-1.5 rounded text-center bg-white min-w-[65px]"
                  style={{ borderColor }}
                >
                  <span
                    className="text-[2em] font-black tracking-tighter block font-serif leading-none"
                    style={{
                      color:
                        template.themeColor !== "#000000"
                          ? template.themeColor
                          : undefined,
                    }}
                  >
                    {renderET(
                      "monogram_text",
                      "Monogram Initials",
                      monogramText,
                      (val) => onUpdateSettings?.({ monogramText: val }),
                      {
                        defaultFontSizePx: 18.0,
                        uppercase: true,
                        tooltip: "Click to edit Monogram Initials",
                      }
                    )}
                  </span>
                  <span
                    className="text-[0.68em] font-black tracking-wider block uppercase border-t mt-0.5 pt-0.5"
                    style={{ borderColor }}
                  >
                    {renderET(
                      "monogram_subtext",
                      "Monogram Subtext",
                      monogramSubtext,
                      (val) => onUpdateSettings?.({ monogramSubtext: val }),
                      {
                        defaultFontSizePx: 7.5,
                        uppercase: true,
                        tooltip: "Click to edit Monogram Subtext",
                      }
                    )}
                  </span>
                </div>
              ) : (
                <div className="border border-dashed p-2 rounded text-[8px] text-zinc-400">
                  Logo Hidden
                </div>
              )}

              {interactive && (
                <div className="absolute inset-0 bg-purple-900/70 opacity-0 group-hover/logo:opacity-100 flex items-center justify-center rounded transition-opacity text-white text-[7.5px] font-bold uppercase tracking-wider text-center p-0.5">
                  Change Logo
                </div>
              )}
            </div>

            {/* In-Preview Logo Customizer Popover */}
            {interactive && activePopover === "logo" && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-full mt-2 w-64 p-3 bg-white dark:bg-zinc-900 border-2 border-purple-600 rounded-lg shadow-2xl z-50 text-xs space-y-2.5 animate-in fade-in text-foreground"
              >
                <div className="flex items-center justify-between border-b pb-1.5 font-bold text-foreground">
                  <span className="flex items-center gap-1">
                    <ImageIcon className="h-3.5 w-3.5 text-purple-600" />
                    <span>Logo &amp; Monogram Setup</span>
                  </span>
                  <button
                    onClick={() => setActivePopover(null)}
                    className="p-0.5 rounded hover:bg-muted cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Mode Selector */}
                <div className="grid grid-cols-3 gap-1 p-0.5 bg-muted rounded text-[10px] font-bold">
                  <button
                    onClick={() =>
                      onUpdateSettings?.({ logoType: "monogram" })
                    }
                    className={`py-1 rounded cursor-pointer ${
                      logoType === "monogram"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground"
                    }`}
                  >
                    Monogram
                  </button>
                  <button
                    onClick={() =>
                      onUpdateSettings?.({ logoType: "image" })
                    }
                    className={`py-1 rounded cursor-pointer ${
                      logoType === "image"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground"
                    }`}
                  >
                    Image
                  </button>
                  <button
                    onClick={() =>
                      onUpdateSettings?.({ logoType: "none" })
                    }
                    className={`py-1 rounded cursor-pointer ${
                      logoType === "none"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground"
                    }`}
                  >
                    None
                  </button>
                </div>

                {/* Monogram Options */}
                {logoType === "monogram" && (
                  <div className="space-y-1.5 pt-1">
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground">
                        Monogram Initials
                      </label>
                      <input
                        type="text"
                        value={monogramText}
                        onChange={(e) =>
                          onUpdateSettings?.({
                            monogramText: e.target.value.toUpperCase(),
                          })
                        }
                        className="w-full h-7 px-2 border rounded text-xs font-bold uppercase bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground">
                        Subtext Under Initials
                      </label>
                      <input
                        type="text"
                        value={monogramSubtext}
                        onChange={(e) =>
                          onUpdateSettings?.({
                            monogramSubtext: e.target.value.toUpperCase(),
                          })
                        }
                        className="w-full h-7 px-2 border rounded text-xs uppercase bg-background"
                      />
                    </div>
                  </div>
                )}

                {/* Image Upload Options */}
                {logoType === "image" && (
                  <div className="space-y-2 pt-1">
                    <label className="block w-full text-center py-2 px-3 border-2 border-dashed border-purple-400 hover:border-purple-600 rounded bg-purple-50/40 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-[11px] cursor-pointer">
                      <Upload className="h-3.5 w-3.5 mx-auto mb-0.5" />
                      <span>Upload Logo File (PNG/JPG)</span>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "logoUrl")}
                        className="hidden"
                      />
                    </label>

                    {/* Logo Size */}
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-muted-foreground">
                        Display Size:
                      </span>
                      <div className="flex gap-1">
                        {(["small", "medium", "large"] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => onUpdateSettings?.({ logoSize: s })}
                            className={`px-1.5 py-0.5 rounded capitalize font-bold cursor-pointer ${
                              logoSize === s
                                ? "bg-purple-600 text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => setActivePopover(null)}
                    className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-bold cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Center: Company Name, Address & GSTIN (Vertically Centered with generous vertical padding) */}
          <div className="flex-1 text-center px-3 flex flex-col justify-center items-center">
            <h1
              className="text-[1.8em] font-black tracking-tight uppercase leading-tight font-serif mb-1"
              style={{
                color:
                  template.themeColor !== "#000000"
                    ? template.themeColor
                    : "#000000",
              }}
            >
              {renderET(
                "company_name",
                "Company Legal Name",
                companyTitle,
                (val) => onUpdateSettings?.({ companyName: val }),
                {
                  defaultFontSizePx: 18.0,
                  uppercase: true,
                  tooltip: "Click to edit Company Legal Name",
                }
              )}
            </h1>
            <p className="text-[0.95em] font-bold tracking-tight uppercase mb-1">
              {renderET(
                "company_address",
                "Company Address",
                companyAddress,
                (val) => onUpdateSettings?.({ address: val }),
                {
                  defaultFontSizePx: 9.5,
                  uppercase: true,
                  tooltip: "Click to edit Company Address",
                }
              )}
            </p>
            <div className="text-[1.05em] font-bold tracking-tight mt-0.5">
              GSTIN No.{" "}
              <span className="font-mono font-black">
                {renderET(
                  "company_gstin",
                  "Company GSTIN",
                  companyGstin,
                  (val) => onUpdateSettings?.({ gstin: val }),
                  {
                    defaultFontSizePx: 10.5,
                    uppercase: true,
                    tooltip: "Click to edit Company GSTIN",
                  }
                )}
              </span>
            </div>
          </div>

          {/* Right: Dynamic QR Code */}
          <div className="relative shrink-0 flex justify-end">
            {showQrCode ? (
              <div
                onClick={() => interactive && setActivePopover("qr")}
                className={`relative w-14 h-14 border p-0.5 bg-white flex flex-col items-center justify-center ${
                  interactive
                    ? "cursor-pointer group/qr hover:ring-2 hover:ring-purple-500 rounded"
                    : ""
                }`}
                style={{ borderColor }}
              >
                {qrCodeType === "custom" && qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full"
                    shapeRendering="crispEdges"
                  >
                    <path
                      d="M0 0h30v30H0zm40 0h10v10H40zm20 0h10v10H60zm10 0h30v30H70zM10 10h10v10H10zm70 0h10v10H80zM0 40h10v10H0zm20 0h20v10H20zm30 0h20v20H50zm30 0h20v10H80zM0 70h30v30H0zm40 10h10v20H40zm20-10h10v10H60zm20 0h20v30H80zm-70 10h10v10H10zm40 10h20v10H50z"
                      fill={borderColor}
                    />
                  </svg>
                )}

                {interactive && (
                  <div className="absolute inset-0 bg-purple-900/70 opacity-0 group-hover/qr:opacity-100 flex items-center justify-center rounded text-white text-[7.5px] font-bold uppercase tracking-wider text-center p-0.5">
                    Change QR
                  </div>
                )}
              </div>
            ) : interactive ? (
              <button
                onClick={() => onUpdateTemplate?.({ showQrCode: true })}
                className="w-14 h-14 border border-dashed border-zinc-300 rounded flex flex-col items-center justify-center text-[7px] text-zinc-400 hover:text-purple-600 hover:border-purple-400 cursor-pointer"
              >
                <QrCode className="h-4 w-4 mb-0.5" />
                <span>Add QR</span>
              </button>
            ) : null}

            {/* In-Preview QR Customizer Popover */}
            {interactive && activePopover === "qr" && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2 w-64 p-3 bg-white dark:bg-zinc-900 border-2 border-purple-600 rounded-lg shadow-2xl z-50 text-xs space-y-2.5 animate-in fade-in text-foreground"
              >
                <div className="flex items-center justify-between border-b pb-1.5 font-bold text-foreground">
                  <span className="flex items-center gap-1">
                    <QrCode className="h-3.5 w-3.5 text-purple-600" />
                    <span>Payment QR Code</span>
                  </span>
                  <button
                    onClick={() => setActivePopover(null)}
                    className="p-0.5 rounded hover:bg-muted cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-muted-foreground">
                    UPI Virtual Payment Address
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) =>
                      onUpdateSettings?.({ upiId: e.target.value })
                    }
                    placeholder="e.g. 9723544545@okbizaxis"
                    className="w-full h-7 px-2 border rounded text-xs font-mono bg-background"
                  />
                </div>

                <label className="block w-full text-center py-2 px-3 border-2 border-dashed border-purple-400 hover:border-purple-600 rounded bg-purple-50/40 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-[11px] cursor-pointer">
                  <Upload className="h-3.5 w-3.5 mx-auto mb-0.5" />
                  <span>Upload Custom QR Image</span>
                  <input
                    ref={qrInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, "qrCodeUrl")}
                    className="hidden"
                  />
                </label>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => onUpdateTemplate?.({ showQrCode: false })}
                    className="text-red-500 text-[10px] font-bold hover:underline cursor-pointer"
                  >
                    Hide QR Code
                  </button>
                  <button
                    onClick={() => setActivePopover(null)}
                    className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-bold cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    };

    // =========================================================================
    // 3. TAX INVOICE BANNER (Auto Vertically Centered in Middle)
    // =========================================================================
    const renderInvoiceTitle = () => {
      const isAccent =
        template.tableHeaderStyle === "accent-filled" &&
        template.themeColor !== "#000000";
      return renderSectionWrapper(
        "invoice_title",
        "Invoice Banner",
        <div
          className="w-full h-full relative border-b-2 flex items-center justify-center px-3 py-2 min-h-[36px]"
          style={{
            borderColor,
            backgroundColor: isAccent ? template.themeColor : "#f8fafc",
            color: isAccent ? "#ffffff" : "#000000",
          }}
        >
          <span className="text-[1.25em] font-black uppercase tracking-wider text-center">
            {renderET(
              "invoice_title",
              "Invoice Title Banner",
              "Tax Invoice",
              undefined,
              {
                defaultFontSizePx: 12.5,
                uppercase: true,
                tooltip: "Invoice Title Banner",
              }
            )}
          </span>
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[1em] font-bold italic"
            style={{ color: isAccent ? "#ffffff" : "#000000" }}
          >
            {renderET(
              "invoice_copy_type",
              "Copy Type Badge",
              copyType,
              undefined,
              {
                defaultFontSizePx: 10.0,
                tooltip: "Copy Type Badge",
              }
            )}
          </span>
        </div>
      );
    };

    // =========================================================================
    // 4. RECEIVER DETAILS (LEFT) & BILL METADATA (RIGHT)
    // =========================================================================
    const renderReceiverMeta = () => {
      return renderSectionWrapper(
        "receiver_meta",
        "Receiver & Metadata",
        <div
          className="grid grid-cols-12 border-b-2 text-[0.95em] w-full h-full"
          style={{ borderColor }}
        >
          {/* Left: Receiver Box */}
          <div
            className="col-span-7 border-r-2 p-2.5 flex flex-col justify-between min-h-[110px]"
            style={{ borderColor }}
          >
            <div className="space-y-0.5">
              <div className="font-bold text-[1.05em] underline">
                {renderET(
                  "receiver_title",
                  "Receiver Box Title",
                  "Details of Receiver (Billed to)",
                  undefined,
                  {
                    defaultFontSizePx: 10.5,
                    tooltip: "Receiver Box Title",
                  }
                )}
              </div>
              <div className="grid grid-cols-12 gap-1 pt-0.5">
                <span className="col-span-2 font-bold text-[1em]">M/s. :</span>
                <span className="col-span-10 font-black uppercase text-[1.1em] truncate">
                  {renderET(
                    "receiver_name",
                    "Customer Name",
                    invoice.customerName,
                    undefined,
                    {
                      defaultFontSizePx: 11.0,
                      uppercase: true,
                      tooltip: "Customer Name (Sample)",
                    }
                  )}
                </span>
              </div>
              <div className="grid grid-cols-12 gap-1">
                <span className="col-span-2 font-bold text-[0.95em]">Add. :</span>
                <span className="col-span-10 uppercase text-[0.95em] font-semibold leading-tight">
                  {renderET(
                    "receiver_address",
                    "Customer Address",
                    invoice.customerAddress || "SURAT, GUJARAT",
                    undefined,
                    {
                      defaultFontSizePx: 9.5,
                      uppercase: true,
                      tooltip: "Customer Address (Sample)",
                    }
                  )}
                </span>
              </div>
              <div className="grid grid-cols-12 gap-1">
                <span className="col-span-2"></span>
                <span className="col-span-10 uppercase font-semibold text-[0.95em]">
                  {renderET(
                    "receiver_city",
                    "Customer City",
                    invoice.customerCity || "SURAT",
                    undefined,
                    {
                      defaultFontSizePx: 9.5,
                      uppercase: true,
                      tooltip: "Customer City (Sample)",
                    }
                  )}
                </span>
              </div>

              {/* Custom Fields in Receiver Box */}
              {receiverFields.map((cf) => (
                <div key={cf.id} className="grid grid-cols-12 gap-1 pt-0.5">
                  <span className="col-span-3 font-bold text-[0.95em]">
                    {renderET(
                      `custom_field_${cf.id}`,
                      `Custom Field: ${cf.label}`,
                      cf.label,
                      (val) => {
                        const updated = (template.customFields || []).map((f) =>
                          f.id === cf.id ? { ...f, label: val } : f
                        );
                        onUpdateTemplate?.({ customFields: updated });
                      },
                      { defaultFontSizePx: 9.5 }
                    )}{" "}
                    :
                  </span>
                  <span className="col-span-9 font-semibold text-[0.95em] uppercase">
                    {renderET(
                      `custom_field_${cf.id}_val`,
                      `Custom Field Value: ${cf.label}`,
                      cf.value || "-",
                      (val) => {
                        const updated = (template.customFields || []).map((f) =>
                          f.id === cf.id ? { ...f, value: val } : f
                        );
                        onUpdateTemplate?.({ customFields: updated });
                      },
                      { defaultFontSizePx: 9.5 }
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-1 border-t border-dotted border-black/50 mt-1">
              <div className="flex justify-between items-center text-[1.05em] font-bold">
                <div>
                  GSTINO :{" "}
                  <span className="font-mono font-black text-[1.1em]">
                    {renderET(
                      "receiver_gstin",
                      "Customer GSTIN",
                      invoice.customerGstin || "24AGQPT2491L1ZO",
                      undefined,
                      {
                        defaultFontSizePx: 10.5,
                        uppercase: true,
                        tooltip: "Customer GSTIN (Sample)",
                      }
                    )}
                  </span>
                </div>
                <div>
                  State :{" "}
                  <span className="font-mono font-bold">
                    {renderET(
                      "receiver_gstin",
                      "State Code",
                      invoice.customerStateCode || "24",
                      undefined,
                      {
                        defaultFontSizePx: 10.5,
                        tooltip: "State Code (Sample)",
                      }
                    )}
                  </span>{" "}
                  <span className="uppercase">
                    {renderET(
                      "receiver_gstin",
                      "State Name",
                      invoice.customerState || "GUJARAT",
                      undefined,
                      {
                        defaultFontSizePx: 10.5,
                        uppercase: true,
                        tooltip: "State Name (Sample)",
                      }
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Bill Metadata Box */}
          <div className="col-span-5 text-[0.9em] leading-tight flex flex-col justify-between">
            <div
              className="grid grid-cols-12 border-b p-2 px-2.5 items-center min-h-[44px]"
              style={{ borderColor }}
            >
              <span className="col-span-4 font-bold text-[1em]">Bill No :</span>
              <span
                className="col-span-8 font-black text-[1.25em] font-mono text-right"
                style={{
                  color:
                    template.themeColor !== "#000000"
                      ? template.themeColor
                      : undefined,
                }}
              >
                {renderET(
                  "bill_number",
                  "Invoice Number",
                  invoice.invoiceNo,
                  undefined,
                  {
                    defaultFontSizePx: 12.5,
                    tooltip: "Invoice Number (Sample)",
                  }
                )}
              </span>
            </div>
            <div
              className={`grid grid-cols-12 p-2 px-2.5 items-center min-h-[44px] ${
                template.showAckIrn || template.showVehicleTransport || headerRightFields.length > 0
                  ? "border-b"
                  : ""
              }`}
              style={{ borderColor }}
            >
              <span className="col-span-4 font-bold text-[1em]">Date :</span>
              <span className="col-span-8 font-black text-[1.1em] text-right">
                {renderET(
                  "bill_date",
                  "Invoice Date",
                  invoice.date,
                  undefined,
                  {
                    defaultFontSizePx: 11.0,
                    tooltip: "Invoice Date (Sample)",
                  }
                )}
              </span>
            </div>

            {template.showAckIrn && (
              <>
                <div
                  className="grid grid-cols-12 border-b p-1 px-1.5 text-[0.85em]"
                  style={{ borderColor }}
                >
                  <span className="col-span-4 font-semibold">ACK No :</span>
                  <span className="col-span-8 text-right font-mono font-bold">
                    {renderET(
                      "ack_irn",
                      "ACK Number",
                      invoice.ackNo || "162625465338519",
                      undefined,
                      {
                        defaultFontSizePx: 8.5,
                        tooltip: "ACK Number",
                      }
                    )}
                  </span>
                </div>
                <div
                  className="grid grid-cols-12 border-b p-1 px-1.5 text-[0.85em]"
                  style={{ borderColor }}
                >
                  <span className="col-span-4 font-semibold">Date :</span>
                  <span className="col-span-8 text-right font-semibold">
                    {renderET(
                      "ack_irn",
                      "ACK Date",
                      invoice.ackDate || "02/08/2026 11:17:00 AM",
                      undefined,
                      {
                        defaultFontSizePx: 8.5,
                        tooltip: "ACK Date",
                      }
                    )}
                  </span>
                </div>
                <div
                  className="grid grid-cols-12 border-b p-1 px-1.5 text-[0.8em] leading-none"
                  style={{ borderColor }}
                >
                  <span className="col-span-3 font-semibold">IRN :</span>
                  <span className="col-span-9 text-right font-mono font-bold break-all">
                    {renderET(
                      "ack_irn",
                      "IRN Hash",
                      invoice.irn ||
                        "124530801ecefda7fd4e0972ffe7a9a50d8f8f30e60086b9fe88e8e6828bb9ec",
                      undefined,
                      {
                        defaultFontSizePx: 8.0,
                        tooltip: "IRN Hash",
                      }
                    )}
                  </span>
                </div>
              </>
            )}

            {template.showVehicleTransport && (
              <>
                <div
                  className="grid grid-cols-12 border-b p-1 px-1.5 text-[0.85em]"
                  style={{ borderColor }}
                >
                  <span className="col-span-4 font-semibold">
                    Eway Bill No :
                  </span>
                  <span className="col-span-8 text-right font-mono">
                    {renderET(
                      "transport_meta",
                      "Eway Bill No",
                      invoice.ewayBillNo || "-",
                      undefined,
                      {
                        defaultFontSizePx: 8.5,
                        tooltip: "Eway Bill No",
                      }
                    )}
                  </span>
                </div>
                <div
                  className="grid grid-cols-12 border-b p-1 px-1.5 text-[0.85em]"
                  style={{ borderColor }}
                >
                  <span className="col-span-4 font-semibold">Vehicle No :</span>
                  <span className="col-span-8 text-right font-mono">
                    {renderET(
                      "transport_meta",
                      "Vehicle No",
                      invoice.vehicleNo || "-",
                      undefined,
                      {
                        defaultFontSizePx: 8.5,
                        tooltip: "Vehicle No",
                      }
                    )}
                  </span>
                </div>
                <div
                  className="grid grid-cols-12 p-1 px-1.5 text-[0.85em]"
                  style={{ borderColor }}
                >
                  <span className="col-span-4 font-semibold">Transport :</span>
                  <span className="col-span-8 text-right font-mono">
                    {renderET(
                      "transport_meta",
                      "Transport Name",
                      invoice.transportNo || "-",
                      undefined,
                      {
                        defaultFontSizePx: 8.5,
                        tooltip: "Transport Carrier Name",
                      }
                    )}
                  </span>
                </div>
              </>
            )}

            {/* Custom Fields in Header Right */}
            {headerRightFields.map((cf) => (
              <div
                key={cf.id}
                className="grid grid-cols-12 border-t p-1 px-1.5 text-[0.85em]"
                style={{ borderColor }}
              >
                <span className="col-span-4 font-semibold">
                  {renderET(
                    `custom_field_${cf.id}`,
                    `Custom Field: ${cf.label}`,
                    cf.label,
                    (val) => {
                      const updated = (template.customFields || []).map((f) =>
                        f.id === cf.id ? { ...f, label: val } : f
                      );
                      onUpdateTemplate?.({ customFields: updated });
                    },
                    { defaultFontSizePx: 8.5 }
                  )}{" "}
                  :
                </span>
                <span className="col-span-8 text-right font-semibold">
                  {renderET(
                    `custom_field_${cf.id}_val`,
                    `Custom Field Value: ${cf.label}`,
                    cf.value || "-",
                    (val) => {
                      const updated = (template.customFields || []).map((f) =>
                        f.id === cf.id ? { ...f, value: val } : f
                      );
                      onUpdateTemplate?.({ customFields: updated });
                    },
                    { defaultFontSizePx: 8.5 }
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    };

    // =========================================================================
    // 5. CONSIGNEE / SHIPPED-TO (OPTIONAL)
    // =========================================================================
    const renderConsignee = () => {
      if (!template.showConsignee) return null;
      return renderSectionWrapper(
        "consignee",
        "Consignee Details",
        <div
          className="w-full h-full border-b-2 bg-zinc-50/50 text-[0.95em] grid grid-cols-12 gap-2 p-2"
          style={{ borderColor }}
        >
          <div className="col-span-6 border-r pr-2" style={{ borderColor }}>
            <div className="font-bold underline text-[1em]">
              Details of Consignee (Shipped to)
            </div>
            <div className="font-black uppercase text-[1.05em] mt-0.5">
              {renderET(
                "consignee_box",
                "Consignee Name",
                invoice.customerName,
                undefined,
                {
                  defaultFontSizePx: 10.5,
                  uppercase: true,
                }
              )}
            </div>
            <div className="text-[0.9em] uppercase leading-tight">
              {renderET(
                "consignee_box",
                "Consignee Address",
                invoice.customerAddress || "Same as Billing Address",
                undefined,
                {
                  defaultFontSizePx: 9.0,
                  uppercase: true,
                }
              )}
            </div>
          </div>
          <div className="col-span-6 pl-1 space-y-0.5 text-[0.9em] flex flex-col justify-center">
            <div className="flex justify-between">
              <span className="font-semibold">Dispatch Doc No:</span>
              <span className="font-mono font-bold">
                DC-{invoice.invoiceNo}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Destination:</span>
              <span className="uppercase font-bold">
                {invoice.customerCity || "SURAT"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Mode of Terms:</span>
              <span>By Road / Standard Delivery</span>
            </div>
          </div>
        </div>
      );
    };

    // =========================================================================
    // 6. ITEMIZED PRODUCTS TABLE
    // =========================================================================
    const renderItemsTable = () => {
      const isHeaderAccent =
        template.tableHeaderStyle === "accent-filled" &&
        template.themeColor !== "#000000";

      return renderSectionWrapper(
        "items_table",
        "Products Table",
        <div className="w-full flex-1 flex flex-col justify-start relative">
          <table className="w-full table-fixed border-collapse text-[1em] leading-tight">
            <thead>
              <tr
                className="border-b-2 font-black text-center text-[1em] h-7"
                style={{
                  borderColor,
                  backgroundColor: isHeaderAccent
                    ? template.themeColor
                    : "#f8fafc",
                  color: isHeaderAccent ? "#ffffff" : "#000000",
                }}
              >
                <th
                  className="border-r py-1 px-1 w-[4%]"
                  style={{ borderColor }}
                >
                  Sr.
                </th>
                <th
                  className="border-r py-1 px-1 text-left w-[28%]"
                  style={{ borderColor }}
                >
                  Product Name
                </th>
                <th
                  className="border-r py-1 px-1 w-[10%]"
                  style={{ borderColor }}
                >
                  HSN
                </th>
                <th
                  className="border-r py-1 px-1 w-[11%]"
                  style={{ borderColor }}
                >
                  Nt.Wt. <br />
                  Pcs/Box
                </th>
                <th
                  className="border-r py-1 px-1 w-[11%]"
                  style={{ borderColor }}
                >
                  Rate
                </th>
                <th
                  className="border-r py-1 px-1 w-[14%]"
                  style={{ borderColor }}
                >
                  Taxable <br />
                  Amount
                </th>
                <th
                  className="border-r py-1 px-1 w-[6%]"
                  style={{ borderColor }}
                >
                  GST %
                </th>
                {!isInterstate ? (
                  <>
                    <th
                      className="border-r py-1 px-1 w-[8%]"
                      style={{ borderColor }}
                    >
                      CGST <br />
                      Amt.
                    </th>
                    <th className="py-1 px-1 w-[8%]">
                      SGST <br />
                      Amt.
                    </th>
                  </>
                ) : (
                  <th className="py-1 px-1 w-[16%]">
                    IGST <br />
                    Amt.
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((item, index) => (
                <tr
                  key={item.id || index}
                  className={`font-semibold text-[1.05em] ${
                    template.tableDensity === "compact" ? "h-5" : "h-6"
                  }`}
                >
                  <td
                    className="border-r py-0.5 px-1 text-center font-bold"
                    style={{ borderColor }}
                  >
                    {index + 1}
                  </td>
                  <td
                    className="border-r py-0.5 px-1 font-black uppercase text-[1.08em] truncate"
                    style={{ borderColor }}
                  >
                    {renderET(
                      "items_table_body",
                      "Product Name",
                      item.productName,
                      undefined,
                      {
                        defaultFontSizePx: 10.5,
                        uppercase: true,
                        tooltip: "Product Name (Sample)",
                      }
                    )}
                  </td>
                  <td
                    className="border-r py-0.5 px-1 text-center font-mono font-bold text-[1.05em]"
                    style={{ borderColor }}
                  >
                    {renderET(
                      "items_table_body",
                      "HSN Code",
                      item.hsn,
                      undefined,
                      {
                        defaultFontSizePx: 10.0,
                        tooltip: "HSN Code (Sample)",
                      }
                    )}
                  </td>
                  <td
                    className="border-r py-0.5 px-1 text-right font-mono font-black text-[1.1em]"
                    style={{ borderColor }}
                  >
                    {formatNumber(item.quantity, 3)}
                  </td>
                  <td
                    className="border-r py-0.5 px-1 text-right font-mono font-black text-[1.1em]"
                    style={{ borderColor }}
                  >
                    {formatNumber(item.rate, 4)}
                  </td>
                  <td
                    className="border-r py-0.5 px-1 text-right font-mono font-black text-[1.15em]"
                    style={{ borderColor }}
                  >
                    {formatNumber(item.taxableAmount, 2)}
                  </td>
                  <td
                    className="border-r py-0.5 px-1 text-center font-mono font-bold text-[1.05em]"
                    style={{ borderColor }}
                  >
                    {item.gstRate.toFixed(3)}
                  </td>
                  {!isInterstate ? (
                    <>
                      <td
                        className="border-r py-0.5 px-1 text-right font-mono font-bold text-[1.05em]"
                        style={{ borderColor }}
                      >
                        {formatNumber(item.cgstAmount, 2)}
                      </td>
                      <td className="py-0.5 px-1 text-right font-mono font-bold text-[1.05em]">
                        {formatNumber(item.sgstAmount, 2)}
                      </td>
                    </>
                  ) : (
                    <td className="py-0.5 px-1 text-right font-mono font-bold text-[1.05em]">
                      {formatNumber(item.igstAmount, 2)}
                    </td>
                  )}
                </tr>
              ))}

              {/* Spacer rows that gracefully extend table through remaining page height */}
              {Array.from({ length: emptyRowsCount }).map((_, i) => (
                <tr
                  key={`empty_${i}`}
                  className={
                    template.tableDensity === "compact" ? "h-5" : "h-6"
                  }
                >
                  <td className="border-r" style={{ borderColor }}></td>
                  <td className="border-r" style={{ borderColor }}></td>
                  <td className="border-r" style={{ borderColor }}></td>
                  <td className="border-r" style={{ borderColor }}></td>
                  <td className="border-r" style={{ borderColor }}></td>
                  <td className="border-r" style={{ borderColor }}></td>
                  <td className="border-r" style={{ borderColor }}></td>
                  {!isInterstate ? (
                    <>
                      <td className="border-r" style={{ borderColor }}></td>
                      <td></td>
                    </>
                  ) : (
                    <td></td>
                  )}
                </tr>
              ))}

              {/* Total Summary Row */}
              <tr
                className="border-t-2 border-b-2 font-black text-[1.05em] h-7"
                style={{ borderColor }}
              >
                <td
                  colSpan={3}
                  className="border-r py-0.5 px-1 text-center uppercase font-bold"
                  style={{ borderColor }}
                >
                  {renderET(
                    "items_table_totals",
                    "Table Total Label",
                    "Total",
                    undefined,
                    {
                      defaultFontSizePx: 11.5,
                      uppercase: true,
                    }
                  )}
                </td>
                <td
                  className="border-r py-0.5 px-1 text-right font-mono font-black text-[1.15em]"
                  style={{ borderColor }}
                >
                  {formatNumber(invoice.totalQuantity, 3)}
                </td>
                <td
                  className="border-r py-0.5 px-1"
                  style={{ borderColor }}
                ></td>
                <td
                  className="border-r py-0.5 px-1 text-right font-mono font-black text-[1.2em]"
                  style={{ borderColor }}
                >
                  {formatNumber(invoice.totalTaxable, 2)}
                </td>
                <td
                  className="border-r py-0.5 px-1"
                  style={{ borderColor }}
                ></td>
                {!isInterstate ? (
                  <>
                    <td
                      className="border-r py-0.5 px-1 text-right font-mono font-black text-[1.1em]"
                      style={{ borderColor }}
                    >
                      {formatNumber(invoice.totalCgst, 2)}
                    </td>
                    <td className="py-0.5 px-1 text-right font-mono font-black text-[1.1em]">
                      {formatNumber(invoice.totalSgst, 2)}
                    </td>
                  </>
                ) : (
                  <td className="py-0.5 px-1 text-right font-mono font-black text-[1.1em]">
                    {formatNumber(invoice.totalIgst, 2)}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      );
    };

    // =========================================================================
    // 7. AMOUNT IN WORDS, BANK DETAILS & TAX BREAKDOWN
    // =========================================================================
    const renderWordsBankTax = () => {
      return renderSectionWrapper(
        "words_bank_tax",
        "Words, Bank & Tax",
        <div
          className="grid grid-cols-12 border-b-2 text-[0.95em] w-full h-full"
          style={{ borderColor }}
        >
          {/* Left Column: Words & Bank Details */}
          <div
            className="col-span-7 border-r-2 p-2 flex flex-col justify-between min-h-[105px]"
            style={{ borderColor }}
          >
            {template.showAmountInWords && (
              <div className="mb-1">
                <span className="font-bold text-[1.05em]">Rs.in words:- </span>
                <span className="font-black italic uppercase tracking-tight text-[1em]">
                  {renderET(
                    "amount_in_words",
                    "Amount In Words",
                    invoice.amountInWords,
                    undefined,
                    {
                      defaultFontSizePx: 10.0,
                      uppercase: true,
                      tooltip: "Amount In Words",
                    }
                  )}
                </span>
              </div>
            )}

            {template.showBankDetails && (
              <div
                className="pt-1.5 border-t space-y-0.5 text-[0.95em]"
                style={{ borderColor }}
              >
                <div className="grid grid-cols-12">
                  <span className="col-span-4 font-bold">Bank Name</span>
                  <span className="col-span-8 font-black uppercase">
                    :{" "}
                    {renderET(
                      "bank_details",
                      "Bank Name",
                      settings.bankName || "KOTAK BANK",
                      (val) => onUpdateSettings?.({ bankName: val }),
                      {
                        defaultFontSizePx: 9.5,
                        uppercase: true,
                        tooltip: "Click to edit Bank Name",
                      }
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-4 font-bold">Branch Name</span>
                  <span className="col-span-8 uppercase font-medium">
                    :{" "}
                    {renderET(
                      "bank_details",
                      "Branch Name",
                      settings.branchName || "VRAJBHUMI APT.",
                      (val) => onUpdateSettings?.({ branchName: val }),
                      {
                        defaultFontSizePx: 9.5,
                        uppercase: true,
                        tooltip: "Click to edit Branch Name",
                      }
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-4 font-bold">Bank A/c.No.</span>
                  <span className="col-span-8 font-mono font-black text-[1.1em]">
                    :{" "}
                    {renderET(
                      "bank_details",
                      "Bank Account Number",
                      settings.accountNumber || "9948291051",
                      (val) => onUpdateSettings?.({ accountNumber: val }),
                      {
                        defaultFontSizePx: 10.5,
                        tooltip: "Click to edit Bank Account Number",
                      }
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-4 font-bold">RTGS/IFSC Code</span>
                  <span className="col-span-8 font-mono font-black text-[1.05em]">
                    :{" "}
                    {renderET(
                      "bank_details",
                      "Bank IFSC Code",
                      settings.ifscCode || "KKBK0000883",
                      (val) => onUpdateSettings?.({ ifscCode: val }),
                      {
                        defaultFontSizePx: 10.0,
                        uppercase: true,
                        tooltip: "Click to edit Bank IFSC Code",
                      }
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Tax Breakdown & Grand Total */}
          <div className="col-span-5 p-2 flex flex-col justify-between text-[1.05em]">
            {template.showTaxBreakdown && (
              <div className="space-y-1">
                {template.showDiscount &&
                invoice.discount &&
                invoice.discount > 0 ? (
                  <div className="flex justify-between font-bold text-red-700 print:text-black">
                    <span>Less: Discount</span>
                    <span className="font-mono font-bold text-[1.1em]">
                      - {formatNumber(invoice.discount, 2)}
                    </span>
                  </div>
                ) : null}
                {!isInterstate ? (
                  <>
                    <div className="flex justify-between font-bold">
                      <span>CGST</span>
                      <span className="font-mono font-bold text-[1.1em]">
                        {formatNumber(invoice.totalCgst, 2)}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>SGST</span>
                      <span className="font-mono font-bold text-[1.1em]">
                        {formatNumber(invoice.totalSgst, 2)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between font-bold">
                    <span>IGST</span>
                    <span className="font-mono font-bold text-[1.1em]">
                      {formatNumber(invoice.totalIgst, 2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span>Round off</span>
                  <span className="font-mono">
                    {formatNumber(invoice.roundOff, 2)}
                  </span>
                </div>
              </div>
            )}

            {/* Total Bill Amount Box */}
            <div
              className="flex justify-between items-center border-t-2 pt-1.5 mt-1.5"
              style={{ borderColor }}
            >
              <span className="font-black text-[1.15em] uppercase">
                {renderET(
                  "grand_total",
                  "Total Bill Amount Label",
                  "Total Bill Amount",
                  undefined,
                  {
                    defaultFontSizePx: 11.5,
                    uppercase: true,
                  }
                )}
              </span>
              <span
                className="font-mono font-black text-[1.55em] text-right"
                style={{
                  color:
                    template.themeColor !== "#000000"
                      ? template.themeColor
                      : undefined,
                }}
              >
                {renderET(
                  "grand_total",
                  "Grand Total Value",
                  formatNumber(invoice.grandTotal, 2),
                  undefined,
                  {
                    defaultFontSizePx: 15.5,
                  }
                )}
              </span>
            </div>
          </div>
        </div>
      );
    };

    // =========================================================================
    // 8. TERMS & CONDITIONS & SIGNATORY BOX
    // =========================================================================
    const renderTermsSignatory = () => {
      const termsList =
        settings.termsAndConditions && settings.termsAndConditions.length > 0
          ? settings.termsAndConditions
          : [
              "1. Goods Once Sold Will Not Be Accepted.",
              '2. "Subject to "SURAT" Jurisdiction. E.&O.E"',
            ];

      return renderSectionWrapper(
        "terms_signatory",
        "Terms & Signature",
        <div className="grid grid-cols-12 text-[0.9em] w-full h-full p-2">
          {/* Terms & Conditions */}
          <div className="col-span-7 pr-2 space-y-0.5 leading-tight flex flex-col justify-center">
            {template.showTerms && (
              <>
                <div className="font-bold underline text-[0.95em] flex items-center justify-between">
                  <span>
                    {renderET(
                      "terms_conditions",
                      "Terms & Conditions Header",
                      "Terms & Condition :",
                      undefined,
                      {
                        defaultFontSizePx: 9.5,
                      }
                    )}
                  </span>
                  {interactive && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const updatedTerms = [
                          ...termsList,
                          `${termsList.length + 1}. New custom clause.`,
                        ];
                        onUpdateSettings?.({
                          termsAndConditions: updatedTerms,
                        });
                      }}
                      className="text-[8px] font-bold text-purple-600 hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <Plus className="h-2.5 w-2.5" />
                      <span>Add Clause</span>
                    </button>
                  )}
                </div>
                {termsList.slice(0, 4).map((term, i) => (
                  <div key={i} className="flex items-start gap-1">
                    {renderET(
                      "terms_conditions",
                      `Term Clause ${i + 1}`,
                      term,
                      (val) => {
                        const newTerms = [...termsList];
                        newTerms[i] = val;
                        onUpdateSettings?.({ termsAndConditions: newTerms });
                      },
                      {
                        defaultFontSizePx: 9.0,
                        tooltip: "Click to edit term clause",
                      }
                    )}
                  </div>
                ))}
              </>
            )}

            {/* Custom fields in footer left */}
            {footerLeftFields.map((cf) => (
              <div key={cf.id} className="pt-1 font-bold text-[0.9em]">
                <span>{cf.label}: </span>
                <span className="font-semibold uppercase">{cf.value}</span>
              </div>
            ))}
          </div>

          {/* Signature Box */}
          <div
            className="col-span-5 text-center flex flex-col justify-between pl-2 border-l-2 min-h-[65px] relative"
            style={{ borderColor }}
          >
            {template.showSignature && (
              <>
                <div className="font-black text-[1.05em] uppercase truncate">
                  {renderET(
                    "signatory_title",
                    "Signatory Firm Title",
                    signatoryFirmTitle,
                    (val) => onUpdateSettings?.({ signatoryFirmTitle: val }),
                    {
                      defaultFontSizePx: 10.5,
                      uppercase: true,
                      tooltip: "Click to edit Signatory Firm Title",
                    }
                  )}
                </div>

                <div
                  onClick={() => interactive && setActivePopover("signature")}
                  className={`py-0.5 flex items-center justify-center min-h-[34px] relative ${
                    interactive
                      ? "cursor-pointer group/sig rounded hover:ring-2 hover:ring-purple-500 transition-all"
                      : ""
                  }`}
                >
                  {signatureType === "image" && signatureUrl ? (
                    <img
                      src={signatureUrl}
                      alt="Authorized Signature"
                      className="max-h-10 max-w-[130px] object-contain"
                    />
                  ) : (
                    <span
                      className="text-[2em] font-bold italic tracking-wider text-blue-900 leading-none select-none"
                      style={{ fontFamily: signatureFont }}
                    >
                      {renderET(
                        "signatory_name",
                        "Authorized Signatory Name",
                        signatoryName,
                        (val) =>
                          onUpdateSettings?.({
                            authorizedSignatoryName: val,
                          }),
                        {
                          defaultFontSizePx: 18.0,
                          tooltip: "Click to edit Signatory Name",
                        }
                      )}
                    </span>
                  )}

                  {interactive && (
                    <div className="absolute inset-0 bg-purple-900/70 opacity-0 group-hover/sig:opacity-100 flex items-center justify-center rounded text-white text-[7.5px] font-bold uppercase tracking-wider text-center p-0.5">
                      Change Signature
                    </div>
                  )}
                </div>

                <div className="font-bold text-[0.9em]">
                  {renderET(
                    "signatory_label",
                    "Signatory Label",
                    signatoryLabel,
                    (val) => onUpdateSettings?.({ signatoryLabel: val }),
                    {
                      defaultFontSizePx: 9.0,
                      tooltip: "Click to edit Signatory Label",
                    }
                  )}
                </div>
              </>
            )}

            {/* In-Preview Signature Customizer Popover */}
            {interactive && activePopover === "signature" && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2 w-64 p-3 bg-white dark:bg-zinc-900 border-2 border-purple-600 rounded-lg shadow-2xl z-50 text-xs space-y-2.5 animate-in fade-in text-foreground"
              >
                <div className="flex items-center justify-between border-b pb-1.5 font-bold text-foreground">
                  <span className="flex items-center gap-1">
                    <PenTool className="h-3.5 w-3.5 text-purple-600" />
                    <span>Signature &amp; Stamp Setup</span>
                  </span>
                  <button
                    onClick={() => setActivePopover(null)}
                    className="p-0.5 rounded hover:bg-muted cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-muted rounded text-[10px] font-bold">
                  <button
                    onClick={() =>
                      onUpdateSettings?.({ signatureType: "font" })
                    }
                    className={`py-1 rounded cursor-pointer ${
                      signatureType === "font"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground"
                    }`}
                  >
                    Digital Font
                  </button>
                  <button
                    onClick={() =>
                      onUpdateSettings?.({ signatureType: "image" })
                    }
                    className={`py-1 rounded cursor-pointer ${
                      signatureType === "image"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground"
                    }`}
                  >
                    Upload Stamp
                  </button>
                </div>

                {signatureType === "font" && (
                  <div className="space-y-1.5 pt-1">
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground">
                        Signatory Name
                      </label>
                      <input
                        type="text"
                        value={signatoryName}
                        onChange={(e) =>
                          onUpdateSettings?.({
                            authorizedSignatoryName: e.target.value,
                          })
                        }
                        className="w-full h-7 px-2 border rounded text-xs font-semibold bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground">
                        Script Cursive Style
                      </label>
                      <select
                        value={signatureFont}
                        onChange={(e) =>
                          onUpdateSettings?.({ signatureFont: e.target.value })
                        }
                        className="w-full h-7 px-2 border rounded text-xs bg-background"
                      >
                        <option value="'Brush Script MT', cursive, sans-serif">
                          Brush Script (Classic)
                        </option>
                        <option value="'Great Vibes', cursive">
                          Great Vibes (Formal Calligraphy)
                        </option>
                        <option value="'Dancing Script', cursive">
                          Dancing Script (Modern Fluid)
                        </option>
                        <option value="'Pacifico', cursive">
                          Pacifico (Bold Casual)
                        </option>
                      </select>
                    </div>
                  </div>
                )}

                {signatureType === "image" && (
                  <div className="space-y-2 pt-1">
                    <label className="block w-full text-center py-2 px-3 border-2 border-dashed border-purple-400 hover:border-purple-600 rounded bg-purple-50/40 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-[11px] cursor-pointer">
                      <Upload className="h-3.5 w-3.5 mx-auto mb-0.5" />
                      <span>Upload Signature / Stamp (PNG)</span>
                      <input
                        ref={sigInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "signatureUrl")}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() =>
                      onUpdateTemplate?.({ showSignature: false })
                    }
                    className="text-red-500 text-[10px] font-bold hover:underline cursor-pointer"
                  >
                    Hide Signature
                  </button>
                  <button
                    onClick={() => setActivePopover(null)}
                    className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-bold cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    };

    // =========================================================================
    // 9. CUSTOM FOOTER NOTES
    // =========================================================================
    const renderCustomFooter = () => {
      if (
        !template.sectionsOrder.find((s) => s.id === "custom_footer")
          ?.enabled &&
        footerRightFields.length === 0
      ) {
        return null;
      }
      return renderSectionWrapper(
        "custom_footer",
        "Custom Footer",
        <div
          className="w-full h-full border-t bg-zinc-50 text-[0.85em] text-center font-semibold text-zinc-700 uppercase tracking-tight flex justify-between items-center px-2 py-0.5"
          style={{ borderColor }}
        >
          <div>
            {renderET(
              "custom_footer",
              "Footer Note 1",
              "Thank you for your business!",
              undefined,
              {
                defaultFontSizePx: 8.5,
              }
            )}
          </div>
          {footerRightFields.map((cf) => (
            <div key={cf.id}>
              {cf.label}: {cf.value}
            </div>
          ))}
          <div>
            {renderET(
              "custom_footer",
              "Footer Note 2",
              "This is a computer generated tax invoice.",
              undefined,
              {
                defaultFontSizePx: 8.5,
              }
            )}
          </div>
        </div>,
        false
      );
    };

    // Map section IDs to their render functions
    const sectionRenderers: Record<InvoiceSectionId, () => React.ReactNode> = {
      devotional: renderDevotionalHeader,
      brand_header: renderBrandHeader,
      invoice_title: renderInvoiceTitle,
      receiver_meta: renderReceiverMeta,
      consignee: renderConsignee,
      items_table: renderItemsTable,
      words_bank_tax: renderWordsBankTax,
      terms_signatory: renderTermsSignatory,
      custom_footer: renderCustomFooter,
    };

    // Build ordered list of sections based on template.sectionsOrder
    const orderedSections = (template.sectionsOrder || [])
      .filter((section) => section.enabled)
      .map((section) => {
        const renderer = sectionRenderers[section.id];
        return renderer ? renderer() : null;
      });

    return (
      <div
        ref={ref}
        id="official-invoice-print-sheet"
        className={`invoice-print-container relative bg-white text-black ${containerBorderClass} shadow-md flex flex-col justify-between w-full max-w-[720px] min-h-[960px] mx-auto p-0 print:border-2 print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-full print:min-h-[285mm] select-text`}
        style={{
          fontFamily: fontFamilyStyle,
          fontSize: `${baseFontSizePx}px`,
          lineHeight: "1.2",
          borderColor,
          boxSizing: "border-box",
          pageBreakInside: "avoid",
          breakInside: "avoid",
        }}
      >
        {/* Optional Diagonal Watermark */}
        {template.showWatermark && template.watermarkText && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden opacity-10">
            <span className="text-7xl font-black tracking-widest uppercase rotate-[-35deg] text-zinc-900 pointer-events-auto">
              {renderET(
                "watermark",
                "Watermark Text",
                template.watermarkText,
                (val) => onUpdateTemplate?.({ watermarkText: val }),
                {
                  defaultFontSizePx: 72,
                  uppercase: true,
                  tooltip: "Click to edit watermark text",
                }
              )}
            </span>
          </div>
        )}

        <div className="relative z-1 w-full flex flex-col flex-1 justify-between">
          {orderedSections}
        </div>
      </div>
    );
  }
);

InvoiceTemplate.displayName = "InvoiceTemplate";
