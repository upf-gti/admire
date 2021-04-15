/*
Author: Hermann Plass (hermann.plass@gmail.com)
nav.js (c) 2021
Desc: 
//icons https://icons.getbootstrap.com/#usage
Created:  2021-01-16T09:17:06.826Z
Modified: 2021-02-25T13:42:23.751Z
*/

import React from 'react';
import { Image, Col, Row } from 'react-bootstrap';
import { Link } from "react-router-dom";

import './Navbar.css';
import Logo from 'assets/img/logo.png';

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
      <li key={key} onClick={this.props.onClick}>
        <a>
            <i className={this.props.icon} style={this.props.style}></i>
            {this.props.title}
        </a>
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
    super(props);

    if (Navbar._instance)
      return Navbar._instance;

    Navbar._props = props;
    Navbar._instance = this;

    this.nav = React.createRef();
  }

  componentDidMount(){
    this.setState({isMounted:true})
  }
  
  componentWillUnmount(){
    this.setState({isMounted:false})
  }
  
  static GET() {
    return Navbar._instance || new Navbar(Navbar._props);
  }

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
    return (
      <>
        <nav id="sidebar">

          <Row className="sidebar-header">
            <Col xs={4}><Image id="logo" className="App-logo" src={Logo} rounded /></Col>
            <Col style={{ paddingLeft: 0 }}>
              <h3>AdMiRe:</h3>
              {<h5>{`${this.props.user.type !== "0" ? "Admin" : "User"} ${ this.props.user.id }`}</h5>}
            </Col>
          </Row>


          <ul className="list-unstyled components">
            <p>Main Menu</p>
            {(()=>Object.values(this.state.items))()}
            {this.props.children}
          </ul>


          <ul className="list-unstyled">
            <NavItem k="-2" icon="bi bi-power" title="Logout" onClick={this.props.doLogOut}/>
          </ul>


        </nav>
        <div id="overlay" onClick={() => {
          document.querySelectorAll("#sidebar, #content, #overlay").forEach((v, k, a) => { v.classList.toggle("active"); });
          document.querySelectorAll('.collapse.in').forEach((v, k, a) => { v.classList.toggle("in"); });
          document.querySelectorAll('a[aria-expanded=true]').forEach((v, k, a) => { v.attr('aria-expanded', 'false'); });
        }}></div>

        <button type="button" id="sidebarCollapse" className="btn btn-info" onClick={(e) => {
          document.getElementById("sidebar").classList.add("active");
          document.getElementById("overlay").classList.add("active");
          document.querySelectorAll(".collapse.in").forEach((v, k, a) => { v.classList.toggle("in"); });
          document.querySelectorAll('a[aria-expanded=true]').forEach((v, k, a) => { v.attr('aria-expanded', 'false'); });
        }}><i className="bi bi-text-left"></i></button>
      </>
    );
  }
}