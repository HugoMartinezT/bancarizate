import { Routes, Route } from 'react-router-dom';
import CreateTeacher from '../components/Teachers/CreateTeacher';
import EditTeacher from '../components/Teachers/EditTeacher';
import TeacherList from '../components/Teachers/TeacherList';

const Teachers = () => {
  return (
    <div>
      <Routes>
        <Route path="/" element={<TeacherList />} />
        <Route path="list" element={<TeacherList />} />
        <Route path="create" element={<CreateTeacher />} />
        <Route path="edit/:id" element={<EditTeacher />} />
      </Routes>
    </div>
  );
};

export default Teachers;