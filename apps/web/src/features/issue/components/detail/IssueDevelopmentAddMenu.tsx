import { GitBranch, GitPullRequest, Link2, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function IssueDevelopmentAddMenu({
  onLink,
  onCreate,
  onCreateBranch,
}: {
  onLink: () => void;
  onCreate: () => void;
  onCreateBranch: () => void;
}) {
  const t = useTranslations('issue.development');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-muted-foreground">
          <Plus className="size-3.5" />
          {t('add')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={onCreateBranch}>
          <GitBranch />
          Create branch
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onCreate}>
          <GitPullRequest />
          {t('createPullRequest')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onLink}>
          <Link2 />
          {t('linkExisting')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
