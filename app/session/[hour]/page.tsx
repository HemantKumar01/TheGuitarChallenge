import { CURRICULUM } from '@/data/curriculum';
import LessonPage from '@/components/lessons/LessonPage';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ hour: string }>;
}

export function generateStaticParams() {
  return CURRICULUM.map((_, i) => ({ hour: String(i) }));
}

export default async function HourPage({ params }: Props) {
  const { hour } = await params;
  const idx = parseInt(hour);
  const lesson = CURRICULUM[idx];
  if (!lesson) notFound();
  return <LessonPage lesson={lesson} lessonIndex={idx} />;
}
