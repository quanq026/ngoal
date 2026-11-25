import { useState } from 'react';
import { toast } from 'sonner';
import {
  Archive,
  ArchiveRestore,
  FolderInput,
  GitBranch,
  Share2,
  Trash2,
} from 'lucide-react';
import type { ProjectDetail } from '@/lib/api/endpoints/projects';
import type { IssueDetail as IssueDetailRow } from '@/lib/api/endpoints/issues';
import { useRestoreIssue } from '@/services/issues.service';
import { usePermissions } from '@/hooks/usePermissions';
import { useArchiveAction } from '../../hooks/useArchiveAction';
import { DeleteIssueDialog } from './IssueActions';
import { buildIssueBranchName } from '../../utils/issuePrompt';
import { writeClipboardText } from '../../utils/clipboard';
import { useSession } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import MoveIssueDialog from './MoveIssueDialog';
import { useTranslations } from 'next-intl';

export default function IssueActionsBar({
  project,
  issue,
  variant = 'row',
  onDeleted,
}: {
  project: ProjectDetail;
  issue: IssueDetailRow;
  variant?: 'row' | 'header';
  onDeleted?: () => void;
}) {
  const t = useTranslations('issue.actionsBar');
  const { can } = usePermissions();
  const { data: session } = useSession();
  const canEdit = can('work_items', 'edit');
  const canDelete = can('work_items', 'delete');
  const { archive, dialog: archiveDialog } = useArchiveAction(project);
  const restoreIssue = useRestoreIssue(project.project.ref);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [moving, setMoving] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/${issue.identifier}`);
    toast.success(t('shortLinkCopied'));
  }

  async function copyBranch() {
    await writeClipboardText(buildIssueBranchName(issue, session?.user));
    toast.success(t('branchCopied'));
  }

  const btnSize = variant === 'header' ? 'icon-xs' : 'icon-sm';

  const buttons = (
    <div className={variant === 'header' ? 'flex items-center gap-0.5' : 'flex flex-wrap gap-1.5'}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={btnSize}
            className="text-muted-foreground hover:text-foreground"
            onClick={copyLink}
          >
            <Share2 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('copyShortLink')}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={btnSize}
            className="text-muted-foreground hover:text-foreground"
            onClick={copyBranch}
          >
            <GitBranch className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('copyBranch')}</TooltipContent>
      </Tooltip>
      {canEdit && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={btnSize}
              className="text-muted-foreground hover:text-foreground"
              onClick={() => (issue.archivedAt ? restoreIssue.mutate(issue.id) : archive(issue))}
            >
              {issue.archivedAt ? (
                <ArchiveRestore className="size-4" />
              ) : (
                <Archive className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{issue.archivedAt ? t('restore') : t('archive')}</TooltipContent>
        </Tooltip>
      )}
      {canDelete && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={btnSize}
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setMoving(true)}
            >
              <FolderInput className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('move')}</TooltipContent>
        </Tooltip>
      )}
      {canDelete && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={btnSize}
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('delete')}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );

  return (
    <>
      {variant === 'header' ? buttons : <div className="mb-3 flex justify-end px-1">{buttons}</div>}

      {confirmingDelete && (
        <DeleteIssueDialog
          project={project}
          issue={issue}
          onClose={() => setConfirmingDelete(false)}
          onDeleted={onDeleted}
        />
      )}

      {moving && (
        <MoveIssueDialog project={project} issue={issue} onClose={() => setMoving(false)} />
      )}

      {archiveDialog}
    </>
  );
}
