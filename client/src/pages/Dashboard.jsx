import React, { useEffect, useState } from 'react';
import { GemIcon, Sparkles } from 'lucide-react';
import { useAuth, useUser, Protect } from '@clerk/clerk-react';
import CreationItem from '../components/CreationItem';
import axios from 'axios';
import { toast } from 'react-toastify';

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const Dashboard = () => {
  const [creations, setCreations] = useState([]);
  const [loading, setLoading] = useState(true);

  const { getToken } = useAuth();
  const { user } = useUser();

  const getDashboardData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        toast.error("Authentication failed");
        return;
      }

      const { data } = await axios.get('/api/user/get-user-creations', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (data.success) {
        setCreations(data.creations);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getDashboardData();
  }, []);

  return (
    <div className='h-full overflow-y-scroll p-6'>
      {/* Stats Cards */}
      <div className='flex justify-start gap-4 flex-wrap'>
        {/* Total Creations */}
        <div className='flex justify-between items-center w-72 p-4 px-6 bg-white rounded-xl border border-gray-200'>
          <div className='text-slate-600'>
            <p className='text-sm'>Total Creations</p>
            <h2 className='text-lg font-semibold'>{creations.length}</h2>
          </div>
          <div className='w-10 h-10 rounded bg-gradient-to-br from-[#3588F2] to-[#0BB0D7] text-white flex justify-center items-center'>
            <Sparkles className='w-5 text-white' />
          </div>
        </div>

        {/* Active Plan */}
        <div className='flex justify-between items-center w-72 p-4 px-6 bg-white rounded-xl border border-gray-200'>
          <div className='text-slate-600'>
            <p className='text-sm'>Active Plan</p>
            <h2 className='text-lg font-semibold'>
              <Protect plan="premium" fallback="Free">
                Premium
              </Protect>
            </h2>
          </div>
          <div className='w-10 h-10 rounded bg-gradient-to-br from-[#FF61C5] to-[#9E53EE] text-white flex justify-center items-center'>
            <GemIcon className='w-5 text-white' />
          </div>
        </div>
      </div>

      {/* Creations List */}
      {loading ? (
        <div className='flex justify-center items-center h-3/4'>
          <div className='animate-spin rounded-full h-11 w-11 border-4 border-purple-500 border-t-transparent'></div>
        </div>
      ) : (
        <div className='space-y-3'>
          <p className='mt-6 mb-4'>Recent Creations</p>
          {creations.map(item => (
            <CreationItem key={item._id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;