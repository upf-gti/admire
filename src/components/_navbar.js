/*
Author: Hermann Plass (hermann.plass@gmail.com)
nav.js (c) 2021
Desc: 
//icons https://icons.getbootstrap.com/#usage
Created:  2021-01-16T09:17:06.826Z
Modified: 2021-04-21T09:50:53.880Z
*/

import React from 'react';
import { Image, Col, Row, Button } from 'react-bootstrap';
import { Link } from "react-router-dom";

import './_navbar.scss';
import Logo from 'assets/img/logo-nav.png';

let count = 0;
export class NavItem extends React.Component {
  
  render() {
    
    var key = this.props.k+(new Date()).toDateString() + ++count;
    if (this.props.children && this.props.children.length > 0) 
    {
      return (
        <li key={key} className={`dropdown ${this.props.active ? "active" : ""} `}>
          <a href={`#${this.props.title}Submenu`} data-toggle="collapse" data-bs-toggle="dropdown" aria-expanded="false" className="dropdown-toggle">
            <i className={this.props.icon} style={this.props.style}></i>
            {this.props.title}
          </a>
          <ul className="collapse list-unstyled" id={this.props.title + "Submenu"}>
            {this.props.children}
          </ul>
        </li>);
    }

    if(this.props.to || this.props.href )
    return (
      <li key={key} onClick={this.props.onClick}>
        <Link to={this.props.to??this.props.href??"malformed_link"}>
            <i className={this.props.icon} style={this.props.style}></i>
            {this.props.title}
        </Link>
      </li>
    );

    return (
      <li id={this.props.id} key={key} onClick={this.props.onClick}>
        <Link>
            <i className={this.props.icon} style={this.props.style}></i>
            {this.props.title}
        </Link>
      </li>
    )
    


    
  }
}

export default class Navbar extends React.Component {
  static _props;
  state =
  {
    items : {},
    buttons: [],
    hidden: true,
    isMounted:false
  }

  constructor(props) {
    
    //if (Navbar._instance)
    //  return Navbar._instance;
      
    super(props);
    
    //Navbar._props = props;
    //Navbar._instance = this;

    this.nav = React.createRef();
  }

  componentDidMount(){
    this.setState({isMounted:true})
  }
  
  componentWillUnmount(){
    this.setState({isMounted:false})
  }
  
  //static GET() {
  //  return Navbar._instance;
  //}

  addItem(id, item)
  {
    let {items} = this.state;
    
    if(item === null)
      delete items[id];
    else
      items[id] = item;

    if(!this.state.isMounted) 
      return;
    this.setState({items});
    this.forceUpdate();
  }



  //TODO: setTitle method

  render() {

    let CollapseButtonCallback = (e) => {
      document.getElementById("sidebar").classList.add("active");
      document.getElementById("overlay").classList.add("active");
      document.querySelectorAll(".collapse.in").forEach((v, k, a) => { v.classList.toggle("in"); });
      document.querySelectorAll('a[aria-expanded=true]').forEach((v, k, a) => { v.attr('aria-expanded', 'false'); });
    };

    let OverlayCallback = () => {
      document.querySelectorAll("#sidebar, #content, #overlay").forEach((v, k, a) => { v.classList.toggle("active"); });
      document.querySelectorAll('.collapse.in').forEach((v, k, a) => { v.classList.toggle("in"); });
      document.querySelectorAll('a[aria-expanded=true]').forEach((v, k, a) => { v.attr('aria-expanded', 'false'); });
    };

    return (
      <>
        <nav id="sidebar">

          <Row className="sidebar-header">
            <Col xs={4}><Image id="logo" className="App-logo" src={Logo}/></Col>
            <Col style={{ paddingLeft: 0 }}>
              <h3>AdMiRe:</h3>
              <h5>{`${this.props.user.type !== "0" ? "Admin" : "User"} ${ this.props.user.id }`}</h5>
            </Col>
          </Row>


          <ul className="list-unstyled">
            <Link to="/"> <li><i className="bi bi-layout-text-sidebar-reverse"/> Lobby </li></Link>
            {(()=>Object.values(this.state.items))()}
            {this.props.items}
            {this.props.children}
          </ul>

          <ul id="nav-footer" className="list-unstyled">
            <Button as={Link} to="/" id="logout" size="sm" variant="outline-light" onClick={this.props.doLogOut}> LogOut <i className="bi bi-door-open"/> </Button>
            {/*<NavItem k="-2" icon="bi bi-door-open" id="logout" title="LogOut" onClick={this.props.doLogOut}/>*/}
          </ul>


        </nav>
        <div id="overlay" onClick={OverlayCallback}></div>
        <Button size="sm" variant="outline-light" id="sidebarCollapse" onClick={CollapseButtonCallback}> <i className="bi bi-list"/> </Button>
      </>
    );
  }
}