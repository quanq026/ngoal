'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { InstanceTeam } from '@/lib/api/endpoints/god';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { compactCount } from '../../utils/numbers';

// The team list. A row (or the pencil in its Actions cell) opens the team in the side
// panel, where the full counts, the projects and the member list are.
export default function GodTeamsTable({
  teams,
  onSelect,
}: {
  teams: InstanceTeam[];
  onSelect: (teamId: number) => void;
}) {
  const t = useTranslations('god.teams');
  const tCommon = useTranslations('common');

  return (
    <div className="overflow-x-auto">
      <Table className="w-full min-w-[560px] table-fixed">
        <colgroup>
          <col className="w-[44%]" />
          <col className="w-[15%]" />
          <col className="w-[15%]" />
          <col className="w-[16%]" />
          <col className="w-[10%]" />
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs font-medium text-muted-foreground">
              {t('columns.team')}
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">
              {t('columns.projects')}
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">
              {t('columns.members')}
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">
              {t('columns.issues')}
            </TableHead>
            <TableHead className="text-right text-xs font-medium text-muted-foreground">
              {tCommon('actions')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((team) => (
            <TableRow
              key={team.id}
              className="cursor-pointer"
              onClick={() => onSelect(team.id)}
              title={t('showDetails')}
            >
              <TableCell className="px-3 py-3">
                <span className="truncate text-sm font-medium">{team.name}</span>
              </TableCell>

              <TableCell className="px-3 py-3 text-sm tabular-nums" title={String(team.projectCount)}>
                {compactCount(team.projectCount)}
              </TableCell>

              <TableCell className="px-3 py-3 text-sm tabular-nums" title={String(team.memberCount)}>
                {compactCount(team.memberCount)}
              </TableCell>

              <TableCell className="px-3 py-3 text-sm tabular-nums" title={String(team.issueCount)}>
                {compactCount(team.issueCount)}
              </TableCell>

              <TableCell className="px-3 py-3 text-right">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                aria-label={t('open')}
                title={t('open')}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(team.id);
                }}
              >
                <Pencil />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}
