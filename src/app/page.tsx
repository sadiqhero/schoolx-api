export default function Home() {
  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>SchoolX API</h1>
      <p style={{ fontSize: '1.25rem', color: '#666', maxWidth: '600px' }}>
        Backend API for School Management System. Built with Next.js 14 and MongoDB.
      </p>
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="/api/auth/login" style={{ color: '#0070f3', textDecoration: 'none' }}>Auth Endpoints</a>
        <a href="/api/students" style={{ color: '#0070f3', textDecoration: 'none' }}>Students API</a>
        <a href="/api/announcements" style={{ color: '#0070f3', textDecoration: 'none' }}>Announcements API</a>
        <a href="/api/attendance" style={{ color: '#0070f3', textDecoration: 'none' }}>Attendance API</a>
        <a href="/api/staffs" style={{ color: '#0070f3', textDecoration: 'none' }}>Staffs API</a>
        <a href="/api/terms" style={{ color: '#0070f3', textDecoration: 'none' }}>Terms API</a>
      </div>
    </main>
  );
}