"use client";

import React, { useEffect, useRef, useState } from 'react';

const CKEditor = ({ value, onChange, config = {}, disabled = false }) => {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  // Generate a unique ID for this instance
  const editorId = useRef(`editor-${Math.random().toString(36).substr(2, 9)}`).current;
  const editorInstanceRef = useRef(null);

  // Sync disabled (readOnly) state
  useEffect(() => {
    if (editorInstanceRef.current) {
      editorInstanceRef.current.setReadOnly(disabled);
    }
  }, [disabled]);

  useEffect(() => {
    // 1. Set global base path immediately
    window.CKEDITOR_BASEPATH = '/ckeditor/';

    // 2. Check if CKEditor is already available globally
    if (window.CKEDITOR) {
      setIsScriptLoaded(true);
      return;
    }

    // 3. Check if script tag already exists to prevent duplicates
    const existingScript = document.querySelector('script[src="/ckeditor/ckeditor.js"]');
    if (existingScript) {
      // It's loading or loaded. We'll poll for the window object.
      const interval = setInterval(() => {
        if (window.CKEDITOR) {
          setIsScriptLoaded(true);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }

    // 4. Load the script
    const script = document.createElement('script');
    script.src = '/ckeditor/ckeditor.js';
    script.async = true;

    script.onload = () => {
      // Small delay to ensure it's fully parsed
      setTimeout(() => {
        setIsScriptLoaded(true);
      }, 100);
    };

    script.onerror = () => {
      console.error("CKEditor script failed to load");
    };

    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    // Only initialize if script is loaded and element exists
    if (!isScriptLoaded || !document.getElementById(editorId)) return;

    // Avoid double initialization
    if (editorInstanceRef.current) return;

    try {
      // Safe check for window.CKEDITOR
      if (!window.CKEDITOR) {
        console.error("CKEditor not found on window despite load event");
        return;
      }

      console.log("Initializing CKEditor on", editorId);

      const editor = window.CKEDITOR.replace(editorId, {
        ...config,
        height: 400,
        width: '100%',
        // Explicitly set these to avoid path issues
        baseFloatZIndex: 10000,
        customConfig: '', // Avoid loading external config unless needed

        // --- Paste from Word & Content Preservation Settings ---
        allowedContent: true, // Disable content filtering (ACF)
        pasteFilter: null, // Disable the paste filter (Critical for preserving "messy" Word styles)
        extraPlugins: 'pastefromword,image,table,tabletools', // Only include plugins that actually exist
        pasteFromWordPromptCleanup: false, // Don't ask to clean
        pasteFromWordCleanupFile: '', // No external cleanup
        pasteFromWordRemoveFontStyles: false,
        pasteFromWordRemoveStyles: false,
        forcePasteAsPlainText: false,
        // -------------------------------------------------------
      });

      // Event: instanceReady
      editor.on('instanceReady', () => {
        console.log("CKEditor Instance Ready:", editorId);
        editorInstanceRef.current = editor;
        editor.setData(value);
      });

      // Event: change
      editor.on('change', () => {
        const data = editor.getData();
        if (onChange) {
          onChange(data);
        }
      });

    } catch (error) {
      console.error("Error initializing CKEditor:", error);
    }

    // Cleanup
    return () => {
      const instance = window.CKEDITOR?.instances?.[editorId];
      if (instance) {
        try {
          instance.destroy(false); // false = do not update textarea
        } catch (e) {
          console.warn("CKEditor destroy error", e);
        }
      }
      editorInstanceRef.current = null;
    };
  }, [isScriptLoaded, editorId]); // config excluded to prevent re-init

  // Minimal value sync (only when editor is ready and differs significantly)
  useEffect(() => {
    if (editorInstanceRef.current && value !== editorInstanceRef.current.getData()) {
      // Check focus to avoid interrupting typing
      if (!editorInstanceRef.current.focusManager.hasFocus) {
        editorInstanceRef.current.setData(value);
      }
    }
  }, [value]);

  return (
    <div style={{ minHeight: '400px' }}>
      <textarea id={editorId} defaultValue={value} style={{ display: 'none' }} />
    </div>
  );
};

export default CKEditor;
