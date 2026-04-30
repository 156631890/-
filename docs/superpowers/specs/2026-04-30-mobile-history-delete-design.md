# Mobile History Delete Design

## Context

The mobile sourcing history view currently supports selecting products and exporting them, but it does not provide a way to delete products from the mobile interface. The app already has product deletion support at the app level:

- `App.tsx` exposes `handleDeleteProducts(ids)`.
- `MobileEntry` receives `onDeleteProduct`.
- `MobileHistory` receives selected IDs but does not expose a delete action.

This design completes the missing mobile deletion workflow without changing the desktop dashboard deletion behavior.

## Goal

Allow mobile users to delete selected history products from the History tab.

## User Flow

1. User opens the mobile History tab.
2. User taps `Select`.
3. User selects one or more products.
4. A bottom action bar shows:
   - `Export`
   - `Delete`
5. User taps `Delete`.
6. The app shows a confirmation dialog or browser confirmation with the selected count.
7. If confirmed, the selected products are deleted through the existing `onDeleteProduct(ids)` callback.
8. The selected set is cleared after deletion.
9. If deletion fails at the app/DB layer, `App.tsx` preserves or restores state using the existing delete rollback behavior.

## Component Changes

### `components/mobile/MobileHistory.tsx`

Add props:

- `onDeleteSelected: () => void`
- `canDeleteSelected: boolean`

When `isSelectMode` is true, render a bottom action bar with two stable buttons:

- Export button: opens the existing export menu.
- Delete button: calls `onDeleteSelected`.

The delete button is disabled when `canDeleteSelected` is false.

### `components/MobileEntry.tsx`

Add a handler:

```ts
const handleDeleteSelectedHistory = () => {
  const ids = Array.from(selectedIds);
  if (ids.length === 0) return;
  if (!confirm(`Delete ${ids.length} selected product(s)?`)) return;
  onDeleteProduct?.(ids);
  setSelectedIds(new Set());
};
```

This design intentionally uses the existing confirmation style for the first implementation. If the medium-priority notification work is implemented first, this confirmation should use the shared confirm modal instead of `confirm()`.

Pass the handler and disabled state to `MobileHistory`:

- `onDeleteSelected={handleDeleteSelectedHistory}`
- `canDeleteSelected={selectedIds.size > 0 && Boolean(onDeleteProduct)}`

## Visual Behavior

The History select-mode bottom bar should remain compact on mobile:

- Two equal-width buttons.
- Export keeps the current indigo styling.
- Delete uses red styling.
- The bar stays above the bottom navigation area.

No new screen is required.

## Testing

Add focused tests if the project introduces component testing. In the current test setup, the minimum implementation verification is:

- Unit-test any extracted selected-ID helper if one is added.
- Run `npm test`.
- Run `npx tsc --noEmit`.
- Run `npm run build`.

Manual checks:

- Select no products: delete is disabled.
- Select one product: delete asks for confirmation and deletes it.
- Select multiple products: delete asks for confirmation and deletes all selected products.
- Cancel confirmation: no products are deleted and selection remains.
- Export still works in select mode.

## Relationship To Price Unit Work

This history-delete design is independent of the price unit normalization design in:

`docs/superpowers/specs/2026-04-30-price-unit-normalization-design.md`

Both items should be implemented in the next development pass:

1. Complete price unit normalization for image-recognized product prices.
2. Add mobile history deletion.

They can be implemented in either order because they touch mostly separate modules.

## Out Of Scope

- Bulk undo.
- Trash/archive storage.
- Desktop dashboard deletion changes.
- Replacing all app confirmations with a custom modal; that belongs to the medium-priority notification cleanup.
