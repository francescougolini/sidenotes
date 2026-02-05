/**
 * Sidenotes - Notes App
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at
 * https://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2023-2026 Francesco Ugolini
 *
 * SPDX-License-Identifier: MPL-2.0
 */

import React, {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useMemo,
  useId,
} from 'react';
import { useDebounce } from '../hooks/useDebounce';
import {
  countWords,
  getReadTime,
  downloadLocalFile,
  darkenColor,
  getFileType,
  formatBytes,
} from '../utils/utils';
import {
  CopyIcon,
  ShareIcon,
  CheckIcon,
  DownloadIcon,
  PaletteIcon,
  BinIcon,
  AttachFileIcon,
  DownloadFileIcon,
  RemoveFileIcon,
  CollapseNoteIcon,
  ExpandNoteIcon,
} from './Icons';

const Note = ({
  note,
  index,
  totalNotes,
  onUpdate,
  onDeleteRequest,
  onMove,
  onDuplicate,
  availableColors,
  defaultTitle,
}) => {
  const {
    id,
    title,
    content,
    accentColor,
    attachment,
    collapsed = false,
  } = note;

  const positionId = useId();
  const fileInputId = useId();

  const [localContent, setLocalContent] = useState(content);
  const [isDragging, setIsDragging] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);
  const [shareStatus, setShareStatus] = useState('idle');

  // Collapse / expand state
  const [isCollapsible, setIsCollapsible] = useState(false);

  // Undo/redo state
  const [history, setHistory] = useState([content]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [localTitle, setLocalTitle] = useState(title);

  // Refs
  const titleRef = useRef(null);
  const contentRef = useRef(null);
  const fileInputRef = useRef(null);
  const positionRef = useRef(null);
  const noteRef = useRef(null);

  // Derived state and memoisation
  const iconColorStyle = useMemo(() => {
    const baseColor = darkenColor(accentColor, 50);
    const hoverColor = darkenColor(accentColor, 65);
    return baseColor
      ? {
          '--dynamic-icon-color': baseColor,
          '--dynamic-icon-hover': hoverColor,
        }
      : {};
  }, [accentColor]);

  // Create a temporary URL for the Blob attachment
  useEffect(() => {
    let url = null;
    const blob = attachment?.blob;
    if (blob instanceof Blob || blob instanceof File) {
      url = URL.createObjectURL(blob);
      setBlobUrl(url);
    } else {
      setBlobUrl(null);
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [attachment?.blob]);

  // Sync content to local state when prop changes
  useEffect(() => {
    setLocalContent(content);
    // Reset history if the note ID changes (completely new note loaded)
    // but not if just content updates (to preserve history during syncs)
  }, [content]);

  // Sync position input when index changes
  useEffect(() => {
    if (positionRef.current) {
      positionRef.current.value = index;
    }
  }, [index]);

  // Debounced save function
  const debouncedUpdate = useDebounce((updatedFields) => {
    onUpdate({ ...note, ...updatedFields });
  }, 1000);

  // Push to history with debounce to avoid saving every character
  const pushToHistory = useDebounce((newContent) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newContent);
      // Limit history size to 50 steps to save memory
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex((prev) => (prev >= 50 ? 49 : prev + 1));
  }, 300);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  // DOM Syncing
  useLayoutEffect(() => {
    if (
      titleRef.current &&
      titleRef.current.innerText !== title &&
      title === localTitle
    ) {
      titleRef.current.innerText = title;
    }

    if (
      contentRef.current &&
      contentRef.current.innerText !== content &&
      content === localContent &&
      // Prevent overwriting DOM while user is typing
      document.activeElement !== contentRef.current
    ) {
      contentRef.current.innerText = content;
    }
  }, [title, content, localTitle, localContent]);

  // Height observation
  useLayoutEffect(() => {
    if (!contentRef.current) {
      return;
    }

    const checkOverflow = () => {
      const style = getComputedStyle(document.documentElement);
      const threshold =
        parseInt(style.getPropertyValue('--note-min-content-height')) || 200;

      const hasOverflow = contentRef.current.scrollHeight > threshold;

      setIsCollapsible((prev) => (prev !== hasOverflow ? hasOverflow : prev));
    };

    const resizeObserver = new ResizeObserver(() => {
      checkOverflow();
    });

    resizeObserver.observe(contentRef.current);

    checkOverflow();

    return () => resizeObserver.disconnect();
  }, []);

  // Handlers
  const processFile = (file) => {
    if (!file) {
      return;
    }
    const newAttachment = {
      name: file.name,
      type: getFileType(file.type),
      mimeType: file.type,
      size: file.size,
      blob: file,
    };
    onUpdate({ ...note, attachment: newAttachment });
  };

  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        e.preventDefault();
        processFile(items[i].getAsFile());
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleTitleInput = (e) => {
    const text = e.target.innerText;
    setLocalTitle(text);
    debouncedUpdate({ title: text });
  };

  const handleTitleBlur = (e) => {
    const titleText = e.target.innerText.trim();

    if (e.target.innerText.trim() === '') {
      const fallback = defaultTitle;
      e.target.innerText = fallback;
      setLocalTitle(fallback);
      onUpdate({ ...note, title: fallback });
    } else {
      onUpdate({ ...note, title: titleText });
    }
  };

  const handleTitleFocus = (e) => {
    if (e.target.innerText === defaultTitle) {
      e.target.innerText = '';
    }
  };

  const handleContentInput = (e) => {
    const text = e.target.innerText;
    setLocalContent(text);
    debouncedUpdate({ content: text });
    pushToHistory(text);
  };

  // Custom undo/redo handler
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      // Undo: Ctrl+Z
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          const prevContent = history[newIndex];
          setHistoryIndex(newIndex);
          applyContentRestore(prevContent);
        }
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          const nextContent = history[newIndex];
          setHistoryIndex(newIndex);
          applyContentRestore(nextContent);
        }
      }
    }
  };

  // Helper to restore content and cursor
  const applyContentRestore = (text) => {
    setLocalContent(text);
    debouncedUpdate({ content: text });
    if (contentRef.current) {
      contentRef.current.innerText = text;
      // Restore cursor to end of text
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(contentRef.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  // Toolbar actions
  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(note);
    }
  };

  const handleChangeColor = () => {
    let nextColor = availableColors[0];
    if (availableColors.includes(accentColor)) {
      const idx = availableColors.indexOf(accentColor);
      nextColor =
        idx !== availableColors.length - 1
          ? availableColors[idx + 1]
          : availableColors[0];
    }
    onUpdate({ ...note, accentColor: nextColor });
  };

  const handleMove = (e) => {
    const val = e.target.value;
    if (val === '') {
      return;
    }
    let newIndex = parseInt(val, 10);

    // Clamp values
    if (newIndex > totalNotes) {
      newIndex = totalNotes;
    }
    if (newIndex < 1) {
      newIndex = 1;
    }

    // Only trigger move if the index is valid and actually changed
    if (!isNaN(newIndex) && newIndex !== index) {
      onMove(id, index, newIndex);
      // Optimistically update the input to avoid visual lag or revert
      e.target.value = newIndex;
    } else {
      // Revert to current index if invalid or unchanged
      e.target.value = index;
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: title || defaultTitle,
      text: localContent,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
      } else {
        return;
      }
    }

    // Fallback: copy to clipboard instead of auto-download
    try {
      const fullNote = (title ? title + '\n\n' : '') + localContent;
      await navigator.clipboard.writeText(fullNote);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2000);
    } catch {
      // Last resort: download
      const fullNote = (title ? title + '\n\n' : '') + localContent;
      const filename =
        (title || 'note').replace(/[^\p{L}^\p{N}]+/gu, ' ').trim() + '.txt';
      downloadLocalFile(fullNote, filename, 'text/plain');
      setShareStatus('downloaded');
      setTimeout(() => setShareStatus('idle'), 2000);
    }
  };

  const handleToggleCollapse = () => {
    onUpdate({ ...note, collapsed: !collapsed });
  };

  return (
    <div
      ref={noteRef}
      id={id}
      className={`note ${isDragging ? 'drag-active' : ''}${collapsed && isCollapsible ? ' note-collapsed' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        id={fileInputId}
        name={`note-file-upload-${note.id}`}
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={(e) => processFile(e.target.files[0])}
      />

      <div
        className={`note-title-container ${isCollapsible ? 'has-collapse-button' : ''}`}
        style={{ backgroundColor: accentColor || 'inherit' }}
      >
        <h2
          ref={titleRef}
          className="note-title"
          contentEditable="plaintext-only"
          suppressContentEditableWarning={true}
          onInput={handleTitleInput}
          onFocus={handleTitleFocus}
          onBlur={handleTitleBlur}
        ></h2>

        {isCollapsible && (
          <button
            type="button"
            className="note-collapse-toggle hovering-label"
            aria-label={collapsed ? 'Expand' : 'Collapse'}
            onClick={handleToggleCollapse}
          >
            {collapsed ? (
              <ExpandNoteIcon size="14" />
            ) : (
              <CollapseNoteIcon size="14" />
            )}
          </button>
        )}
      </div>

      {attachment && (
        <div className="note-media-preview">
          <div className="media-controls-overlay">
            <button
              type="button"
              className="download-attachment hovering-label"
              aria-label="Download"
              onClick={() =>
                downloadLocalFile(
                  attachment.blob,
                  attachment.name,
                  attachment.type,
                )
              }
            >
              <DownloadFileIcon />
            </button>
            <button
              type="button"
              className="remove-attachment hovering-label"
              aria-label="Remove"
              onClick={() => onUpdate({ ...note, attachment: null })}
            >
              <RemoveFileIcon />
            </button>
          </div>

          <div
            className="file-chip"
            role="button"
            tabIndex={0}
            onClick={() =>
              downloadLocalFile(
                attachment.blob,
                attachment.name,
                attachment.type,
              )
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                downloadLocalFile(
                  attachment.blob,
                  attachment.name,
                  attachment.type,
                );
              }
            }}
          >
            {attachment.mimeType?.startsWith('image/') && blobUrl && (
              <img
                src={blobUrl}
                alt={attachment.name}
                className="note-attachment-thumbnail"
                loading="lazy"
              />
            )}
            <div className="file-info">
              <strong>{attachment.name}</strong>
              <span>{formatBytes(attachment.size)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="note-text-container" onPaste={handlePaste}>
        <div
          ref={contentRef}
          className="note-text"
          contentEditable="plaintext-only"
          suppressContentEditableWarning={true}
          onInput={handleContentInput}
          onKeyDown={handleKeyDown}
        ></div>
      </div>

      <div className="note-toolbox-container">
        <div className="note-insights">
          <div className="insight-container">
            <div
              className="insight-content hovering-label"
              aria-label="Characters"
            >
              <span>C:</span>
              <span className="character-counter">{localContent.length}</span>
            </div>
          </div>
          <div className="insight-container">
            <div className="insight-content hovering-label" aria-label="Words">
              <span>W:</span>
              <span className="word-counter">{countWords(localContent)}</span>
            </div>
          </div>
          <div className="insight-container">
            <div
              className="insight-content hovering-label"
              aria-label="Time (sec)"
            >
              <span>T:</span>
              <span className="time-counter">{getReadTime(localContent)}</span>
            </div>
          </div>
        </div>

        <div className="note-controls">
          <div className="note-control-container">
            <button
              type="button"
              className="note-control hovering-label attach-file"
              aria-label="Attach file"
              onClick={() => fileInputRef.current?.click()}
              style={iconColorStyle}
            >
              <AttachFileIcon />
            </button>
          </div>

          <div className="note-control-container">
            <button
              type="button"
              className="note-control hovering-label duplicate-note"
              aria-label="Duplicate note"
              onClick={handleDuplicate}
            >
              <CopyIcon />
            </button>
          </div>
          <div className="note-control-container">
            <button
              type="button"
              className="note-control hovering-label share-note"
              aria-label={
                shareStatus === 'copied'
                  ? 'Copied!'
                  : shareStatus === 'downloaded'
                    ? 'Downloaded!'
                    : 'Share note'
              }
              onClick={handleShare}
            >
              {shareStatus === 'copied' ? (
                <CheckIcon size="16" />
              ) : shareStatus === 'downloaded' ? (
                <DownloadIcon size="16" />
              ) : (
                <ShareIcon size="16" />
              )}
            </button>
          </div>
          <div className="note-control-container">
            <button
              type="button"
              className="note-control hovering-label change-accent-color"
              aria-label="Color"
              onClick={handleChangeColor}
              style={iconColorStyle}
            >
              <PaletteIcon />
            </button>
          </div>
          <div className="note-control-container">
            <button
              type="button"
              className="note-control hovering-label delete-note"
              aria-label="Delete"
              onClick={() => onDeleteRequest(id)}
            >
              <BinIcon />
            </button>
          </div>
          <div className="note-control-container">
            <div
              className="note-control hovering-label move-note"
              aria-label="Move note"
            >
              <input
                ref={positionRef}
                id={positionId}
                name={`note-position-${note.id}`}
                type="number"
                min="1"
                max={totalNotes}
                className="note-index editable"
                aria-label={`Change position for note: ${title || 'Untitled'}`}
                defaultValue={index}
                onBlur={handleMove}
                onKeyDown={(e) => e.key === 'Enter' && handleMove(e)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Note);
