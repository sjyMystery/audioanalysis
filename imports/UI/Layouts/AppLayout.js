import React from 'react'
import TrackerReact from 'meteor/ultimatejs:tracker-react';

import {Layout,Menu,Icon,message} from 'antd'
import './BasicLayout.css'
const {Sider,Header}=Layout;
let {SubMenu}=Menu
let MenuItemGroup=Menu.ItemGroup

export class AppLayout extends TrackerReact(React.Component){
    constructor()
    {
        super()
    }
    render(){
        console.log(FlowRouter.go)
        return <Layout style={{height:"100%"}}>
            <Sider className={"sider"}>
                <Menu
                    onClick={this.handleClick}
                    style={{ margin: '16px 0', width: '100%' }}
                    defaultSelectedKeys={['1']}
                    defaultOpenKeys={['sub1']}
                    mode="vertical"
                    theme={"dark"}
                    onSelect={({item,key})=>{
                        if(key==='/logout')
                        {
                            Meteor.logout(()=>{
                                message.success('您已成功登出')
                            })
                        }
                        else {
                            FlowRouter.go(key)
                        }
                    }}
                >
                        <Menu.Item key="/">首页</Menu.Item>
                        <Menu.Item key="/submitRequirement">需求发布</Menu.Item>
                        <Menu.Item key="/getItem">抢单</Menu.Item>
                    {
                        !Meteor.userId() &&
                        <Menu.Item key="/login">登录</Menu.Item>
                    }
                    {
                        !Meteor.userId() &&
                        <Menu.Item key="/register">注册</Menu.Item>
                    }
                    {
                        Meteor.userId() &&
                        <Menu.Item key="/logout">登出</Menu.Item>

                    }
                </Menu>
            </Sider>
            {
                this.props.main
            }
        </Layout>
    }
}