import React from 'react';
import PropTypes from 'prop-types';
import DocumentTitle from 'react-document-title';
import { Icon } from 'antd';
import './UserLayout.css'

const links = [{
    title: '帮助',
    href: '',
}, {
    title: '隐私',
    href: '',
}, {
    title: '条款',
    href: '',
}];

const copyright = <div>Copyright <Icon type="copyright" /> 2017 蚂蚁金服体验技术部出品</div>;

class UserLayout extends React.PureComponent {
    static childContextTypes = {
        location: PropTypes.object,
    }
    static defaultProps={
        title:'微尘星语'
    }
    getChildContext() {
        const { location } = this.props;
        return { location };
    }
    getPageTitle() {
        return this.props.title
    }
    render() {
        const { getRouteData } = this.props;

        return (
            <DocumentTitle title={this.getPageTitle()}>
                <div className={"container"}>
                    <div className={"top"}>
                        <div className={"header"}>
                            <a onclick={()=>FlowRouter.go('/')}>
                                <img alt="" className={"logo"} src="https://gw.alipayobjects.com/zos/rmsportal/NGCCBOENpgTXpBWUIPnI.svg" />
                                <span className={"title"}>微尘星语</span>
                            </a>
                        </div>
                        <div className={"desc"}>微尘星语是江浙沪地区最优秀的外包网站</div>
                        {
                            this.props.main
                        }
                    </div>
                </div>
            </DocumentTitle>
        );
    }
}

export default UserLayout;