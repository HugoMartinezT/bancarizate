import { Routes, Route } from 'react-router-dom';
import CreateStudent from '../components/Students/CreateStudent';
import EditStudent from '../components/Students/EditStudent';
import StudentList from '../components/Students/StudentList';

const Students = () => {
  return (
    <div>
      <Routes>
        <Route path="/" element={<StudentList />} />
        <Route path="list" element={<StudentList />} />
        <Route path="create" element={<CreateStudent />} />
        <Route path="edit/:id" element={<EditStudent />} />
      </Routes>
    </div>
  );
};

export default Students;