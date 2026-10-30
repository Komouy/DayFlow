import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * InfoTooltip Component
 * Renders an unobtrusive, elegant '?' info icon button.
 * Clicking or hovering triggers a portal-rendered glassmorphic popover with
 * dynamic boundary collision detection to ensure text is NEVER cut off by screen
 * edges or parent overflow containers.
 */
export default function InfoTooltip({ text, title, align = 'center', size = 15 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    maxWidth: 300,
    placement: 'bottom',
    arrowLeft: 20
  });

  const triggerRef = useRef(null);
  const bubbleRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Viewport-safe margin & max-width
    const margin = 12;
    const maxWidth = Math.min(320, vw - margin * 2);

    // Measure bubble element if mounted, or sensible estimates
    const bubbleEl = bubbleRef.current;
    const bubbleWidth = bubbleEl ? Math.min(bubbleEl.offsetWidth || 280, maxWidth) : Math.min(280, maxWidth);
    const bubbleHeight = bubbleEl ? (bubbleEl.offsetHeight || 100) : 100;

    // Horizontal placement: Center on trigger, but clamp strictly within [margin, vw - bubbleWidth - margin]
    let left = rect.left + rect.width / 2 - bubbleWidth / 2;
    if (left < margin) {
      left = margin;
    }
    if (left + bubbleWidth > vw - margin) {
      left = Math.max(margin, vw - margin - bubbleWidth);
    }

    // Vertical placement:
    // If rect.top is small (e.g. top headers or view control bars < 160px from top),
    // always flip to 'bottom' so it NEVER gets cut off at top of screen!
    const spaceAbove = rect.top;
    const spaceBelow = vh - rect.bottom;
    const requiredSpace = bubbleHeight + 14;

    let placement = 'top';
    let top = 0;

    if (spaceAbove >= requiredSpace && spaceAbove >= 140) {
      // Placed above
      placement = 'top';
      top = Math.max(margin, rect.top - bubbleHeight - 8);
    } else {
      // Placed below
      placement = 'bottom';
      top = Math.min(vh - bubbleHeight - margin, rect.bottom + 8);
    }

    // Dynamic arrow alignment with trigger center
    const triggerCenter = rect.left + rect.width / 2;
    const arrowLeft = Math.max(16, Math.min(bubbleWidth - 16, triggerCenter - left));

    setCoords({
      top,
      left,
      maxWidth,
      placement,
      arrowLeft
    });
  }, []);

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    // Update on resize or scroll events
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    function handleClickOutside(e) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        bubbleRef.current && !bubbleRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updatePosition]);

  if (!text) return null;

  return (
    <span className="info-tooltip-wrap">
      <button
        ref={triggerRef}
        type="button"
        className={`info-tooltip-btn ${isOpen ? 'is-active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        onMouseEnter={() => {
          if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
            setIsOpen(true);
          }
        }}
        onMouseLeave={() => {
          if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
            setIsOpen(false);
          }
        }}
        aria-label={title || "Informasi bantuan"}
        aria-expanded={isOpen}
      >
        <span className="info-question-char">?</span>
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={bubbleRef}
            className={`info-tooltip-portal-bubble placement-${coords.placement}`}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              maxWidth: `${coords.maxWidth}px`,
              zIndex: 99999
            }}
            role="tooltip"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="info-tooltip-header">
              <span className="info-tooltip-title">{title || 'Informasi'}</span>
              <button
                type="button"
                className="info-tooltip-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Tutup petunjuk"
              >
                <X size={12} />
              </button>
            </div>
            <div className="info-tooltip-text">{text}</div>
            <div
              className="info-tooltip-arrow"
              style={{ left: `${coords.arrowLeft}px` }}
            />
          </div>,
          document.body
        )}
    </span>
  );
}
