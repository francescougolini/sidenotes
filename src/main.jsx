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

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './css/theme.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
