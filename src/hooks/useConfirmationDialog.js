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

import { useState, useCallback } from 'react';

export const useConfirmationDialog = () => {
  const [config, setConfig] = useState({
    isOpen: false,
    message: '',
    actions: [],
    customClasses: [],
  });

  const openDialog = useCallback(({ message, actions, customClasses = [] }) => {
    setConfig({
      isOpen: true,
      message,
      actions,
      customClasses,
    });
  }, []);

  const closeDialog = useCallback(() => {
    setConfig((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    ...config,
    openDialog,
    closeDialog,
  };
};
