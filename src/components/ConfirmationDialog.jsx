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

import React, { useRef, useEffect } from 'react';

const ConfirmationDialog = ({
  isOpen,
  message,
  actions,
  onClose,
  customClasses = [],
}) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.showModal();
    } else if (!isOpen && dialogRef.current) {
      dialogRef.current.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className={`dialog confirmation-dialog ${customClasses.join(' ')}`}
      onClose={onClose}
    >
      <header className="dialog-header confirmation-dialog-header">
        <h2>{message}</h2>
      </header>
      <footer className="dialog-footer confirmation-dialog-footer">
        {actions.map((action, index) => (
          <div key={index} className="dialog-button-container">
            <button
              type="button"
              className={`dialog-button ${action.customClasses ? action.customClasses.join(' ') : ''}`}
              onClick={() => {
                if (action.action) {
                  action.action();
                }
                onClose();
              }}
            >
              {action.actionLabel}
            </button>
          </div>
        ))}
      </footer>
    </dialog>
  );
};

export default ConfirmationDialog;
