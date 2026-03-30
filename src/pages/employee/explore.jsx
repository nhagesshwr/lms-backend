import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiCompass, FiSearch, FiBookOpen, FiFilter } from 'react-icons/fi';
import { getToken, getUser, coursesAPI } from '../../lib/api';
import { Layout, Loading, SearchBar, CourseCard, EmptyState } from '../../components/components';

const CATEGORIES = ['All', 'Frontend', 'Backend', 'Data', 'Design', 'Management', 'DevOps'];

export default function Explore() {
  const router = useRouter();
  const [courses, setCourses]     = useState([]);
  const [search, setSearch]       = useState('');
  const [category, setCategory]   = useState('All');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    const u = getUser();
    if (u?.role !== 'employee') { router.push('/dashboard'); return; }
    coursesAPI.getPublished().then(setCourses).catch(() => setCourses([])).finally(() => setLoading(false));
  }, []);

  const filtered = courses.filter(c => {
    const q = search.toLowerCase();
    return (!search || c.title.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
  });

  return (
    <Layout>
      {loading ? <Loading /> : (
        <>
          <div className="page-header-block">
            <h1 className="page-header-title">Explore</h1>
            <p className="page-header-desc">Discover new courses and expand your skills.</p>
          </div>
          <div className="explore-hero">
            <div className="explore-search-wrap">
              <FiSearch size={20} color="var(--text-dim)" />
              <input
                className="explore-search-input"
                placeholder="Search for courses, skills, topics…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="explore-categories">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`category-chip ${category === cat ? 'active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="section-heading">
            <h2>{filtered.length} Course{filtered.length !== 1 ? 's' : ''} Available</h2>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={<FiBookOpen size={28} />} title="No courses found" description="Try searching for something else" />
          ) : (
            <div className="grid-3">
              {filtered.map(c => (
                <Link key={c.id} href={`/courses/${c.id}`} style={{ textDecoration: 'none' }}>
                  <CourseCard course={c} />
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
