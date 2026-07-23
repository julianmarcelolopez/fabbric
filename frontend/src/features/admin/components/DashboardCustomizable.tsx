import { useEffect, useRef, useState, type ReactNode } from "react";
import { apiJson } from "../../../lib/api";
import type { DashboardLayout, ZoneLayout } from "../types";

export type DashboardCardDef = {
  id: string;
  label: string;
  content: ReactNode;
};

type ZoneKey = "stats" | "paneles";

const EMPTY_ZONE: ZoneLayout = { orden: [], ocultas: [] };
const EMPTY_LAYOUT: DashboardLayout = { stats: EMPTY_ZONE, paneles: EMPTY_ZONE };

/** Ids conocidos en el orden guardado, ignorando los que ya no existen; los nuevos van al final */
function resolveOrder(cardIds: string[], zone: ZoneLayout): string[] {
  const known = new Set(cardIds);
  const ordered = zone.orden.filter((id) => known.has(id));
  const missing = cardIds.filter((id) => !ordered.includes(id));
  return [...ordered, ...missing];
}

function DashboardZone({
  zoneKey,
  title,
  cards,
  zoneLayout,
  editMode,
  onChange,
}: {
  zoneKey: ZoneKey;
  title: string;
  cards: DashboardCardDef[];
  zoneLayout: ZoneLayout;
  editMode: boolean;
  onChange: (next: ZoneLayout) => void;
}) {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const fullOrder = resolveOrder(cards.map((c) => c.id), zoneLayout);
  const ocultasSet = new Set(zoneLayout.ocultas.filter((id) => byId.has(id)));
  const visibleIds = fullOrder.filter((id) => !ocultasSet.has(id));
  const hiddenIds = fullOrder.filter((id) => ocultasSet.has(id));

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [localVisible, setLocalVisible] = useState<string[] | null>(null);
  const shown = localVisible ?? visibleIds;

  function onDragStart(index: number) {
    setLocalVisible(visibleIds);
    setDragIndex(index);
  }

  function onDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index || !localVisible) return;
    const next = [...localVisible];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setLocalVisible(next);
    setDragIndex(index);
  }

  function onDragEnd() {
    setDragIndex(null);
    const next = localVisible;
    setLocalVisible(null);
    if (!next || next.join() === visibleIds.join()) return;
    onChange({ orden: [...next, ...hiddenIds], ocultas: zoneLayout.ocultas });
  }

  function hide(id: string) {
    onChange({ orden: fullOrder, ocultas: [...zoneLayout.ocultas, id] });
  }

  function show(id: string) {
    onChange({ orden: fullOrder, ocultas: zoneLayout.ocultas.filter((x) => x !== id) });
  }

  return (
    <div className="dash-zone">
      <h2>{title}</h2>
      <div className={`dash-grid dash-grid-${zoneKey}`}>
        {shown.map((id, i) => {
          const card = byId.get(id);
          if (!card) return null;
          return (
            <div
              key={id}
              className={`dash-card${dragIndex === i ? " dragging" : ""}`}
              draggable={editMode}
              onDragStart={editMode ? () => onDragStart(i) : undefined}
              onDragOver={editMode ? (e) => onDragOver(e, i) : undefined}
              onDragEnd={editMode ? () => onDragEnd() : undefined}
            >
              {editMode && (
                <div className="dash-card-tools">
                  <span className="dash-grip" title="Arrastrá para ordenar">⠿</span>
                  <button className="dash-hide" title="Ocultar" onClick={() => hide(id)}>✕</button>
                </div>
              )}
              <div className="dash-card-label">{card.label}</div>
              {card.content}
            </div>
          );
        })}
      </div>
      {editMode && hiddenIds.length > 0 && (
        <div className="dash-hidden-list">
          <span className="muted">Ocultas:</span>
          {hiddenIds.map((id) => {
            const card = byId.get(id);
            if (!card) return null;
            return (
              <button key={id} className="btn small" onClick={() => show(id)}>
                Mostrar {card.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DashboardCustomizable({
  initialLayout,
  stats,
  paneles,
}: {
  initialLayout: DashboardLayout | null;
  stats: DashboardCardDef[];
  paneles: DashboardCardDef[];
}) {
  const [layout, setLayout] = useState<DashboardLayout>(initialLayout ?? EMPTY_LAYOUT);
  const [editMode, setEditMode] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextPersist = useRef(true); // no reenviar el layout recién cargado desde /admin/me

  useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void apiJson("/admin/dashboard-layout", {
        method: "PATCH",
        body: JSON.stringify(layout),
      }).catch(() => {
        // El layout es preferencia de UI, no dato de negocio: fallo silencioso
      });
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  return (
    <div className="dash">
      <div className="dash-toolbar">
        <button className={`btn${editMode ? " primary" : ""}`} onClick={() => setEditMode((v) => !v)}>
          {editMode ? "Listo" : "Personalizar"}
        </button>
      </div>
      <DashboardZone
        zoneKey="stats"
        title="Resumen del mes"
        cards={stats}
        zoneLayout={layout.stats}
        editMode={editMode}
        onChange={(next) => setLayout((l) => ({ ...l, stats: next }))}
      />
      <DashboardZone
        zoneKey="paneles"
        title="Detalle"
        cards={paneles}
        zoneLayout={layout.paneles}
        editMode={editMode}
        onChange={(next) => setLayout((l) => ({ ...l, paneles: next }))}
      />
    </div>
  );
}
