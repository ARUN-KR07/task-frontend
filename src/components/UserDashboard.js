import { useEffect, useState, useMemo, useCallback } from "react";
import { Table, Button, Modal, Form, Input, Select, message, Spin, Popconfirm } from "antd";
import API from "../api";

const { Option } = Select;

function UserDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [filterGender, setFilterGender] = useState("All");
  
  const [form] = Form.useForm();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/users");
      const allUsers = res.data.data || res.data;
      // Filter out soft-deleted users (deleted: true)
      const activeUsers = allUsers.filter(user => !user.deleted);
      setUsers(activeUsers);
    } catch (err) {
      message.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Apply gender filter to already filtered active users
  const filteredUsers = useMemo(() => {
    return filterGender === "All" ? users : users.filter(u => u.gender === filterGender);
  }, [users, filterGender]);

  const openAddModal = useCallback(() => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  }, [form]);

  const openEditModal = useCallback((record) => {
    setEditingUser(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  }, [form]);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();

      if (editingUser) {
        await API.patch(`/users/${editingUser.id}`, values);
        message.success("User updated");
      } else {
        await API.post("/users", values);
        message.success("User added");
      }

      setModalVisible(false);
      fetchUsers();
    } catch (err) {
      message.error("Operation failed");
      console.error(err);
    }
  }, [form, editingUser, fetchUsers]);

  const deleteUser = useCallback(async (id) => {
    try {
      await API.patch(`/users/${id}`, { deleted: true });
      // Remove from local state immediately for better UX
      setUsers(prevUsers => prevUsers.filter(u => u.id !== id));
      message.success("User deleted");
    } catch (err) {
      message.error("Delete failed");
    }
  }, []);

  const columns = useMemo(() => [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "Gender", dataIndex: "gender", key: "gender" },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <>
          <Button type="link" onClick={() => openEditModal(record)}>Edit</Button>
          <Popconfirm
            title="Are you sure to delete this user?"
            onConfirm={() => deleteUser(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger>Delete</Button>
          </Popconfirm>
        </>
      )
    }
  ], [openEditModal, deleteUser]);

  return (
    <div style={{ padding: 30 }}>
      <h2>User Management Dashboard</h2>

      <div style={{ marginBottom: 16, display: "flex", gap: 16 }}>
        <Select
          defaultValue="All"
          style={{ width: 150 }}
          onChange={setFilterGender}
        >
          <Option value="All">All</Option>
          <Option value="Male">Male</Option>
          <Option value="Female">Female</Option>
        </Select>

        <Button type="primary" onClick={openAddModal}>Add User</Button>
      </div>

      {loading ? (
        <Spin size="large" />
      ) : (
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          locale={{ emptyText: 'No active users found' }}
        />
      )}

      <Modal
        open={modalVisible}
        title={editingUser ? "Edit User" : "Add User"}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true, message: "Please enter name" }]}>
            <Input />
          </Form.Item>

          <Form.Item name="email" label="Email" rules={[{ required: true, message: "Please enter email" }]}>
            <Input type="email" />
          </Form.Item>

          <Form.Item name="gender" label="Gender" rules={[{ required: true, message: "Please select gender" }]}>
            <Select placeholder="Select gender">
              <Option value="Male">Male</Option>
              <Option value="Female">Female</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default UserDashboard;