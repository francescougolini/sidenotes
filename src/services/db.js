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

import { DB_CONFIG } from '../utils/constants';

export class StorageDB {
  constructor(dbName = DB_CONFIG.DB_NAME, storeName = DB_CONFIG.STORE_NAME) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.db = null; // Cache for the connection
  }

  async init() {
    if (this.db) {
      return this.db;
    } // Return if already initialised

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, DB_CONFIG.VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = (e) => {
        this.db = e.target.result; // Cache connection
        resolve(this.db);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async bulkPut(data) {
    const db = await this.init();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    Object.entries(data).forEach(([id, value]) => store.put(value, id));
    return new Promise((resolve) => (tx.oncomplete = resolve));
  }

  async clear() {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(id) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);

      store.delete(id);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAll() {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const map = {};

        if (Array.isArray(request.result)) {
          request.result.forEach((item) => {
            map[item.id] = item;
          });
        }
        resolve(map);
      };

      request.onerror = () => reject(request.error);
    });
  }
}
