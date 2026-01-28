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

import { useCallback, useRef } from 'react';

export function useDebounce(callback, delay) {
  const timer = useRef();

  const debouncedFunction = useCallback(
    (...args) => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay],
  );

  return debouncedFunction;
}
