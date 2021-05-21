/**
 * Implements the dropdown which allows the user to filter the links that are shown on dashboard
 * @packageDocumentation
 */

 import React, { useState } from "react";
 import {
   Form,
   Dropdown,
   Select,
   Radio,
   Checkbox,
   DatePicker,
 } from "antd";
 import { DownOutlined } from "@ant-design/icons";
 import { OrgInfo } from "../api/Org";
 import { SearchSet, SearchQuery } from "../pages/Dashboard";
 
 /**
  * Props for the [[SearchBox]] component
  * @interface
  */
 export interface Props {
   /**
    * The user's privileges, used to determine whether the user may use the "all links" set
    * @property
    */
   userPrivileges: Set<string>;
 
   /**
    * The orgs of which the user is a member, used to display the list of
    * available link sets
    * @property
    */
   userOrgs: OrgInfo[];

 }
 
 /**
  * The [[FilterDropdown]] component allows the user to choose specific filters which they want their links to be displayed
  * @param props The props
  */
 export const FilterDropdown: React.FC<Props> = (props) => {
   const isAdmin = props.userPrivileges.has("admin");
   const sortOptions = [
     { label: "Ascending", value: "ascending" },
     { label: "Descending", value: "descending" },
   ];
 
   const [dropdownVisible, setDropdownVisible] = useState(false);
   const [org, setOrg] = useState<number | string>(isAdmin ? 1 : 0);
   const [showExpired, setShowExpired] = useState(false);
   const [showDeleted, setShowDeleted] = useState(false);
   const [sortKey, setSortKey] = useState("created_time");
   const [sortOrder, setSortOrder] = useState("descending");
   const [beginTime, setBeginTime] = useState<moment.Moment | null>(null);
   const [endTime, setEndTime] = useState<moment.Moment | null>(null);

   const updateOrg = (e: any) => {
    setOrg(e), () => console.log(org);
   };
 
   const dropdown = (
     <div className="dropdown-form">
       <Form
         layout="vertical"
         initialValues={{
           org: isAdmin ? 1 : 0,
           sortKey: "created_time",
           sortOrder: "descending",
         }}
       >
         <Form.Item name="org" label="Organization">
           <Select value={org} onChange={updateOrg}>
             <Select.Option value={0}>
               <em>My links</em>
             </Select.Option>
             <Select.Option value={2}>
               <em>Shared with me</em>
             </Select.Option>
             {!isAdmin ? (
               <></>
             ) : (
               <Select.Option value={1}>
                 <em>All links</em>
               </Select.Option>
             )}
             {props.userOrgs.map((info) => (
               <Select.Option key={info.id} value={info.id}>
                 {info.name}
               </Select.Option>
             ))}
           </Select>
         </Form.Item>
         <Form.Item name="show_expired">
           <Checkbox
             checked={showExpired}
             onChange={(e) => setShowExpired(e.target.checked)}
           >
             Show expired links?
           </Checkbox>
         </Form.Item>
         {!isAdmin ? (
           <></>
         ) : (
           <Form.Item name="show_deleted">
             <Checkbox
               checked={showDeleted}
               onChange={(e) => setShowDeleted(e.target.checked)}
             >
               Show deleted links?
             </Checkbox>
           </Form.Item>
         )}
         <Form.Item name="sortKey" label="Sort by">
           <Select value={sortKey} onChange={setSortKey}>
             <Select.Option value="relevance">Relevance</Select.Option>
             <Select.Option value="created_time">Time created</Select.Option>
             <Select.Option value="title">Title</Select.Option>
             <Select.Option value="visits">Number of visits</Select.Option>
           </Select>
         </Form.Item>
         <Form.Item name="sortOrder" label="Sort order">
           <Radio.Group
             value={sortOrder}
             onChange={(e) => setSortOrder(e.target.value)}
             options={sortOptions}
             optionType="button"
           />
         </Form.Item>
         <Form.Item name="beginTime" label="Created after">
           <DatePicker
             format="YYYY-MM-DD"
             value={beginTime}
             onChange={setBeginTime}
           />
         </Form.Item>
         <Form.Item name="endTime" label="Created before">
           <DatePicker
             format="YYYY-MM-DD"
             value={endTime}
             onChange={setEndTime}
           />
         </Form.Item>
       </Form>
     </div>
   );
 
   return (
    <Dropdown
        overlay={dropdown}
        visible={dropdownVisible}
        onVisibleChange={setDropdownVisible}
        placement="bottomRight"
        trigger={["click"]}
    >
        <a onClick={e => e.preventDefault()}>
          Filter Links <DownOutlined />
        </a>
    </Dropdown>
   );
 };
 