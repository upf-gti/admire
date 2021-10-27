import { Container } from "react-bootstrap"


export default ({children, ...props}) => {
    return <Container id="page" {...props}>
        {children}
        <style global jsx>{`
        #page{
            /*width:100%;
            //height:100%;
            min-height: 75vh;
            max-height: 75vh;
            padding: .5em 0;*/
            min-height: 25vh;
            overflow-x: hidden; 
            overflow-y: scroll;
            margin: 1em auto 3.3em auto;
        }   
        `}</style>
    </Container>
}