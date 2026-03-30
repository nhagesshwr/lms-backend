import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiBookOpen, FiSearch, FiFilter } from 'react-icons/fi';
import { getToken, getUser, coursesAPI, progressAPI } from '../../lib/api';
import { Layout, Loading, EmptyState, SearchBar, Tabs } from '../../components/components';
import CourseModernCard from '../../components/CourseModernCard';

export default function MyCourses() {
  const router = useRouter();
  const [courses, setCourses]   = useState([]);
  const [progress, setProgress] = useState([]);
  const [search, setSearch]     = useState('');
  const [tab, setTab]           = useState('all');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (u?.role !== 'employee') { router.push('/dashboard'); return; }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [c, p] = await Promise.all([
        coursesAPI.getPublished().catch(() => []),
        progressAPI.getMy().catch(() => mockProgress),
      ]);
      setCourses(c);
      setProgress(p);
    } finally {
      setLoading(false);
    }
  };

  const getProgress = (id) => progress.find(p => p.courseId === id);
  const inProgress  = courses.filter(c => { const p = getProgress(c.id); return p && p.progress > 0 && p.progress < 100; });
  const completed   = courses.filter(c => { const p = getProgress(c.id); return p && p.progress === 100; });
  const notStarted  = courses.filter(c => !getProgress(c.id));

  const filtered = (() => {
    let list = tab === 'in_progress' ? inProgress : tab === 'completed' ? completed : tab === 'not_started' ? notStarted : courses;
    if (search) { const q = search.toLowerCase(); list = list.filter(c => c.title.toLowerCase().includes(q)); }
    return list;
  })();

  const tabs = [
    { id: 'all',         label: 'All Courses',  count: courses.length },
    { id: 'in_progress', label: 'In Progress',  count: inProgress.length },
    { id: 'completed',   label: 'Completed',    count: completed.length },
    { id: 'not_started', label: 'Not Started',  count: notStarted.length },
  ];

  return (
    <Layout>
      {loading ? <Loading /> : (
        <>
          <div className="page-header-block">
            <div className="page-header-left">
              <h1 className="page-header-title">My Courses</h1>
              <p className="page-header-desc">Track your enrolled learning paths.</p>
            </div>
            <div className="page-header-right">
              <Tabs tabs={tabs} active={tab} onChange={setTab} />
              <SearchBar value={search} onChange={setSearch} placeholder="Search courses…" />
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<FiBookOpen size={28} />}
              title="No courses found"
              description="Try a different filter or search term"
            />
          ) : (
            <div className="grid-3">
              {filtered.map(course => {
                const p = getProgress(course.id);
                return (
                  <CourseModernCard 
                    key={course.id}
                    course={course} 
                    progress={p?.progress} 
                    onClick={() => router.push(`/courses/${course.id}`)}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
