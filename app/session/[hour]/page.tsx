import { CURRICULUM } from '@/data/curriculum';
import LessonPage from '@/components/lessons/LessonPage';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ hour: string }>;
}

export function generateStaticParams() {
  return CURRICULUM.map(l => ({ hour: String(l.hour) }));
}

export default async function HourPage({ params }: Props) {
  const { hour } = await params;
  const hourNum = parseInt(hour);
  const lesson = CURRICULUM.find(l => l.hour === hourNum);
  if (!lesson) notFound();
  return <LessonPage lesson={lesson} />;
}
