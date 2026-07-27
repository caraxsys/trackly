import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <>
      <PageHeader description={description} title={title} />
      <Section>
        <EmptyState
          description={`${title} tools will arrive in a future milestone. This space is ready for them.`}
          title={`${title} is ready to grow`}
        />
      </Section>
    </>
  );
}
