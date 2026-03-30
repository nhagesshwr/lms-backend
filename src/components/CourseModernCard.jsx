import React from 'react';
import { FiBook, FiPlay, FiFileText, FiLink, FiCheckCircle } from 'react-icons/fi';

const CourseModernCard = ({ course, progress, onClick, actions }) => {
  return (
    <div className="course-modern-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="cmc-top">
        {/* Radar Rings */}
        <div className="cmc-ring cmc-ring-1"></div>
        <div className="cmc-ring cmc-ring-2"></div>
        <div className="cmc-ring cmc-ring-3"></div>
        <div className="cmc-ring cmc-ring-4"></div>
        <div className="cmc-pulse" style={{ width: '80px', height: '80px' }}></div>
        <div className="cmc-pulse" style={{ width: '140px', height: '140px', animationDelay: '1s' }}></div>

        {/* Center Pill */}
        <div className="cmc-center-pill">
          {progress !== undefined ? <FiBook size={16} fill="currentColor" /> : <FiPlay size={16} fill="currentColor" />}
          <span>{progress !== undefined ? (progress === 100 ? 'Review' : 'Continue') : 'Start'}</span>
        </div>

        {/* Floating Labels */}
        <div className="cmc-float-pill cmc-fp-1">
          <div style={{ display: 'flex', alignItems: 'center' }}>
             <div className="cmc-fp-icon"><FiFileText size={12} /></div>
             <div>
               <div className="cmc-fp-title">Lesson {Math.floor(Math.random() * 5) + 1}</div>
               <div className="cmc-fp-sub">Draft • Oct 24</div>
             </div>
          </div>
        </div>

        <div className="cmc-float-pill cmc-fp-2">
           <div style={{ display: 'flex', alignItems: 'center' }}>
             <div className="cmc-fp-icon"><FiCheckCircle size={12} style={{ color: 'var(--green)' }} /></div>
             <div>
               <div className="cmc-fp-title">Final Quiz</div>
               <div className="cmc-fp-sub">Unlocked</div>
             </div>
          </div>
        </div>

        {/* Floating Icons */}
        <div className="cmc-dot-icon cmc-di-1"><FiBook size={14} /></div>
        <div className="cmc-dot-icon cmc-di-2"><FiLink size={14} /></div>
        <div className="cmc-dot-icon cmc-di-3"><FiFileText size={14} /></div>
        <div className="cmc-dot-icon cmc-di-4"><FiPlay size={14} /></div>
      </div>

      <div className="cmc-body">
        {course.category && (
          <div style={{ display: 'inline-block', padding: '4px 10px', background: 'var(--brand-bg)', color: 'var(--brand)', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {course.category}
          </div>
        )}
        <h3 className="cmc-title">{course.title}</h3>
        <p className="cmc-desc">{course.description || 'Embark on a journey to master this subject with our expert-led modules and interactive content.'}</p>
        
        {progress !== undefined && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Progress</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand)' }}>{progress}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg-soft)', borderRadius: 10, overflow: 'hidden' }}>
              <div 
                style={{ 
                  width: `${progress}%`, 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #a855f7, #6366f1)',
                  borderRadius: 10,
                  transition: 'width 1s ease'
                }} 
              />
            </div>
          </div>
        )}

        {actions && (
          <div
            onClick={e => e.stopPropagation()}
            style={{
              marginTop: 16,
              paddingTop: 14,
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseModernCard;
