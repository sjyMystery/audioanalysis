import React from 'react'
import {mount} from 'react-mounter'
import {AppLayout} from "../../UI/Layouts/AppLayout";
import {HomePage} from "../../UI/Pages/HomePage";
import Login from "../../UI/Pages/Login";
import Register from "../../UI/Pages/Register";
import UserLayout from "../../UI/Layouts/UserLayout";
import SubmitRequirement from "../../UI/Pages/SubmitRequirement";

FlowRouter.route('/',
    {
        action(){
            mount(AppLayout,{
                main:<HomePage/>
            })
        }
    })

FlowRouter.route('/login',
    {
        action(){
            mount(UserLayout,{
                main:<Login/>,
                title:'登录'
            })
        }
    })

FlowRouter.route('/register',
    {
        action(){
            mount(UserLayout,{
                main:<Register/>,
                title:'注册'
            })
        }
    })


FlowRouter.route('/submitRequirement',
    {
        action(){
            mount(AppLayout,{
                main:<SubmitRequirement/>,
                title:'提交需求'
            })
        }
    })