"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import {
  getMyGroups,
  getGroupMembers,
  inviteGroupMember,
  renameGroup,
  leaveGroup,
  createGroup,
  deleteGroup,
  setGroupHidden,
  FOREIGN_KEY_VIOLATION,
  GroupMember,
  Vehicle,
  Station,
} from "@/lib/data";
import { EditableNameList } from "@/components/EditableNameList";

type Group = { id: number; name: string; hidden: boolean };
type Mode = "menu" | "renaming" | "confirmDelete" | "confirmLeave" | null;

function InviteForm({ groupId, onInvited }: { groupId: number; onInvited: () => void }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invite = async () => {
    if (!email) return;
    setInviting(true);
    setError(null);
    try {
      await inviteGroupMember(groupId, email);
      setEmail("");
      onInvited();
    } catch (e) {
      setError(t("inviteError") + (e as Error).message);
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="email"
          inputMode="email"
          placeholder={t("emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-w-0"
        />
        <button
          onClick={invite}
          disabled={inviting || !email}
          className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50 shrink-0"
        >
          {inviting ? t("inviting") : t("invite")}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function CreateGroupForm({ onCreated }: { onCreated: () => void }) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    setError(null);
    try {
      await createGroup(trimmed);
      setName("");
      onCreated();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("groupNamePlaceholder")}
          className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-w-0"
        />
        <button
          onClick={create}
          disabled={creating || !name.trim()}
          className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50 shrink-0"
        >
          {creating ? t("saving") : t("create")}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function AddItemForm({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (name: string) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAdding(true);
    setError(null);
    try {
      await onAdd(trimmed);
      setName("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-w-0"
        />
        <button
          onClick={add}
          disabled={adding || !name.trim()}
          className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 shrink-0"
        >
          {adding ? t("saving") : t("create")}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function GroupHeader({
  group,
  isOwner,
  onChanged,
}: {
  group: Group;
  isOwner: boolean;
  onChanged: () => void;
}) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<Mode>(null);
  const [draft, setDraft] = useState(group.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setMode(null);
    setError(null);
    setDraft(group.name);
  };

  const rename = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await renameGroup(group.id, trimmed);
      onChanged();
      close();
    } catch (e) {
      alert(t("genericError") + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleHidden = async () => {
    setMode(null);
    try {
      await setGroupHidden(group.id, !group.hidden);
      onChanged();
    } catch (e) {
      alert(t("genericError") + (e as Error).message);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteGroup(group.id);
      onChanged();
    } catch (e) {
      const code = (e as { code?: string }).code;
      setError(code === FOREIGN_KEY_VIOLATION ? t("deleteBlockedGroupFk") : (e as Error).message);
      setBusy(false);
    }
  };

  const confirmLeave = async () => {
    setBusy(true);
    try {
      await leaveGroup(group.id);
      onChanged();
    } catch (e) {
      alert(t("genericError") + (e as Error).message);
      setBusy(false);
    }
  };

  const menuButtonClass =
    "w-full py-2.5 rounded-lg text-sm font-medium bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 active:bg-gray-100 dark:active:bg-gray-700";

  if (mode === "renaming") {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-base font-bold bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
        <button onClick={rename} disabled={busy} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">
          ✓
        </button>
        <button onClick={close} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm">
          ✕
        </button>
      </div>
    );
  }

  if (mode === "confirmDelete") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-600 dark:text-gray-300">{t("confirmDeleteGroup")}</p>
        <div className="flex gap-2">
          <button
            onClick={confirmDelete}
            disabled={busy}
            className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
          >
            {busy ? t("saving") : t("deleteGroupLabel")}
          </button>
          <button
            onClick={close}
            disabled={busy}
            className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-semibold rounded-xl"
          >
            {t("cancel")}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  if (mode === "confirmLeave") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-600 dark:text-gray-300">{t("confirmLeaveGroup")}</p>
        <div className="flex gap-2">
          <button
            onClick={confirmLeave}
            disabled={busy}
            className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
          >
            {busy ? t("saving") : t("leaveGroup")}
          </button>
          <button
            onClick={close}
            disabled={busy}
            className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-semibold rounded-xl"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2
          className={`text-base font-bold ${
            group.hidden ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-gray-50"
          }`}
        >
          {group.name}
          {group.hidden && <span className="ml-2 text-xs italic">({t("hiddenBadge")})</span>}
        </h2>
        <button
          onClick={() => setMode(mode === "menu" ? null : "menu")}
          aria-label={group.name}
          className="p-2 -mr-2 text-gray-400 dark:text-gray-500 active:bg-gray-100 dark:active:bg-gray-700 rounded-lg"
        >
          ⋯
        </button>
      </div>

      {mode === "menu" && (
        <div className="flex flex-col gap-1.5 mt-2 p-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 rounded-xl">
          {isOwner && (
            <button onClick={() => setMode("renaming")} className={menuButtonClass}>
              {t("editLabel")}
            </button>
          )}
          <button onClick={toggleHidden} className={menuButtonClass}>
            {group.hidden ? t("unhideLabel") : t("hideLabel")}
          </button>
          {isOwner && (
            <button
              onClick={() => setMode("confirmDelete")}
              className="w-full py-2.5 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 active:bg-red-100 dark:active:bg-red-900"
            >
              {t("deleteGroupLabel")}
            </button>
          )}
          {!isOwner && (
            <button
              onClick={() => setMode("confirmLeave")}
              className="w-full py-2.5 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 active:bg-red-100 dark:active:bg-red-900"
            >
              {t("leaveGroup")}
            </button>
          )}
          <button onClick={close} className={menuButtonClass}>
            {t("cancel")}
          </button>
        </div>
      )}
    </div>
  );
}

function GroupCard({
  group,
  vehicles,
  stations,
  onRenameVehicle,
  onRenameStation,
  onDeleteVehicle,
  onDeleteStation,
  onToggleHiddenVehicle,
  onToggleHiddenStation,
  onAddVehicle,
  onAddStation,
  onGroupsChanged,
}: {
  group: Group;
  vehicles: Vehicle[];
  stations: Station[];
  onRenameVehicle: (id: number, name: string) => Promise<void>;
  onRenameStation: (id: number, name: string) => Promise<void>;
  onDeleteVehicle: (id: number) => Promise<void>;
  onDeleteStation: (id: number) => Promise<void>;
  onToggleHiddenVehicle: (id: number, hidden: boolean) => Promise<void>;
  onToggleHiddenStation: (id: number, hidden: boolean) => Promise<void>;
  onAddVehicle: (groupId: number, name: string) => Promise<void>;
  onAddStation: (groupId: number, name: string) => Promise<void>;
  onGroupsChanged: () => void;
}) {
  const { t } = useLanguage();
  const { session } = useAuth();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setMembers(await getGroupMembers(group.id));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.id]);

  const isOwner = members.some((m) => m.email === session?.user.email && m.role === "owner");
  const myDisplayName = session?.user.user_metadata?.display_name as string | undefined;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-4">
      <GroupHeader group={group} isOwner={isOwner} onChanged={onGroupsChanged} />

      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1.5">{t("vehicles")}</p>
        <EditableNameList
          items={vehicles}
          onRename={onRenameVehicle}
          onDelete={onDeleteVehicle}
          onToggleHidden={onToggleHiddenVehicle}
        />
        <AddItemForm placeholder={t("addVehiclePlaceholder")} onAdd={(name) => onAddVehicle(group.id, name)} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1.5">{t("stations")}</p>
        <EditableNameList
          items={stations}
          onRename={onRenameStation}
          onDelete={onDeleteStation}
          onToggleHidden={onToggleHiddenStation}
        />
        <AddItemForm placeholder={t("addStationPlaceholder")} onAdd={(name) => onAddStation(group.id, name)} />
      </div>

      <div>
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1.5">{t("groupMembers")}</p>
        {loading ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">{t("loading")}</p>
        ) : (
          <ul className="space-y-1.5">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-200">
                  {m.email === session?.user.email && myDisplayName ? myDisplayName : m.email}
                  {m.email === session?.user.email && ` (${t("you")})`}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {m.role === "owner" ? t("owner") : m.status === "pending" ? t("pending") : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isOwner && <InviteForm groupId={group.id} onInvited={load} />}
    </div>
  );
}

export function GroupSettings({
  vehicles,
  stations,
  onRenameVehicle,
  onRenameStation,
  onDeleteVehicle,
  onDeleteStation,
  onToggleHiddenVehicle,
  onToggleHiddenStation,
  onAddVehicle,
  onAddStation,
}: {
  vehicles: Vehicle[];
  stations: Station[];
  onRenameVehicle: (id: number, name: string) => Promise<void>;
  onRenameStation: (id: number, name: string) => Promise<void>;
  onDeleteVehicle: (id: number) => Promise<void>;
  onDeleteStation: (id: number) => Promise<void>;
  onToggleHiddenVehicle: (id: number, hidden: boolean) => Promise<void>;
  onToggleHiddenStation: (id: number, hidden: boolean) => Promise<void>;
  onAddVehicle: (groupId: number, name: string) => Promise<void>;
  onAddStation: (groupId: number, name: string) => Promise<void>;
}) {
  const { t } = useLanguage();
  const { refreshGroupId } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getMyGroups()
      .then(setGroups)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const onGroupsChanged = () => {
    load();
    refreshGroupId();
  };

  if (loading) return <p className="text-sm text-gray-400 dark:text-gray-500">{t("loading")}</p>;

  const sortedGroups = [...groups].sort((a, b) => Number(a.hidden) - Number(b.hidden));

  return (
    <div className="space-y-3">
      {sortedGroups.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          vehicles={vehicles.filter((v) => v.group_id === group.id)}
          stations={stations.filter((s) => s.group_id === group.id)}
          onRenameVehicle={onRenameVehicle}
          onRenameStation={onRenameStation}
          onDeleteVehicle={onDeleteVehicle}
          onDeleteStation={onDeleteStation}
          onToggleHiddenVehicle={onToggleHiddenVehicle}
          onToggleHiddenStation={onToggleHiddenStation}
          onAddVehicle={onAddVehicle}
          onAddStation={onAddStation}
          onGroupsChanged={onGroupsChanged}
        />
      ))}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1.5">{t("createGroup")}</p>
        <CreateGroupForm onCreated={onGroupsChanged} />
      </div>
    </div>
  );
}
