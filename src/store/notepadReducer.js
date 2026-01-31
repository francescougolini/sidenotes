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

export const ACTIONS = {
  SET_NOTEPAD: 'SET_NOTEPAD',
  UPDATE_TITLE: 'UPDATE_TITLE',
  ADD_NOTE: 'ADD_NOTE',
  DUPLICATE_NOTE: 'DUPLICATE_NOTE',
  UPDATE_NOTE: 'UPDATE_NOTE',
  DELETE_NOTE: 'DELETE_NOTE',
  MOVE_NOTE: 'MOVE_NOTE',
};

export function notepadReducer(state, action) {
  const timestamp = Date.now();

  switch (action.type) {
    case ACTIONS.SET_NOTEPAD:
      return { ...action.payload };

    case ACTIONS.UPDATE_TITLE:
      return {
        ...state,
        title: action.payload,
        lastUpdate: timestamp,
      };

    case ACTIONS.ADD_NOTE:
      return {
        ...state,
        lastUpdate: timestamp,
        notes: [...state.notes, action.payload],
      };

    // New Case for Duplication
    case ACTIONS.DUPLICATE_NOTE: {
      const { originalId, newNote } = action.payload;
      const index = state.notes.findIndex((n) => n.id === originalId);
      if (index === -1) {
        return state;
      }

      const updatedNotes = [...state.notes];
      updatedNotes.splice(index + 1, 0, newNote);

      return {
        ...state,
        lastUpdate: timestamp,
        notes: updatedNotes,
      };
    }

    case ACTIONS.UPDATE_NOTE:
      return {
        ...state,
        lastUpdate: timestamp,
        notes: state.notes.map((n) =>
          n.id === action.payload.id ? action.payload : n,
        ),
      };

    case ACTIONS.DELETE_NOTE:
      return {
        ...state,
        lastUpdate: timestamp,
        notes: state.notes.filter((n) => n.id !== action.payload),
      };

    case ACTIONS.MOVE_NOTE: {
      const { oldIndex, newIndex } = action.payload;
      const notes = [...state.notes];
      const from = oldIndex - 1;
      const to = newIndex - 1;

      if (to < 0 || to >= notes.length) {
        return state;
      }

      const [movedNote] = notes.splice(from, 1);
      notes.splice(to, 0, movedNote);

      return {
        ...state,
        lastUpdate: timestamp,
        notes: notes,
      };
    }

    default:
      return state;
  }
}
