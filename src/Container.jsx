/* carbondream - Copyright 2015 Zeroarc Software, LLC
 *
 * Top level container component
 */

'use strict';

// External
let React = require('react/addons');
let Immutable = require('immutable');

// Local
let Annotation = require('./Annotation');
let ModeToggle = require('./ModeToggle');

// Globals
let DEFAULT_SCALE_FACTOR = 1;       // Default scale factor

let Container = React.createClass({
  propTypes: {
    annotations: React.PropTypes.object.isRequired,
    onSave: React.PropTypes.func.isRequired,
    onDelete: React.PropTypes.func.isRequired,
    //Optional
    containerOffsetX: React.PropTypes.number.isRequired,
    containerOffsetY: React.PropTypes.number.isRequired,
  },

  getDefaultProps() {
    return {
      containerOffsetX: 0,
      containerOffsetY: 0,
    };
  },

  getInitialState() {
    return {
      scale: DEFAULT_SCALE_FACTOR,
      pendingAnnotation: null,
      visibleViewerId: null,
      mode: 'marker',
    };
  },

  handleClick(e) {
    e.stopPropagation();

    if (this.state.pendingAnnotation
      || this.state.mode !== 'marker') return;

    console.log('click fired. clientX: ' + e.clientX + ', clientY: ' + e.clientY + ', screenX: ' + e.screenX + ', screenY: ' + e.screenY);

    let offSetX = this.props.containerOffsetX;
    let offSetY = this.props.containerOffsetY;

    let annotation = {
      content: '',
      timeStamp: Date.now(),
      type: this.state.mode,
      x1: (e.clientX + offSetX) / this.state.scale,
      y1: (e.clientY + offSetY) / this.state.scale,
      x2: (e.clientX + offSetX) / this.state.scale, //14 & 24 are the size of the marker
      y2: (e.clientY + offSetY) / this.state.scale,
    };

    this.setState({
      pendingAnnotation: annotation
    });
  },

  handleMouseDown(e) {
    e.stopPropagation();

    if (this.state.pendingAnnotation
      || this.state.visibleViewerId
      || this.state.mode === 'marker') return;

    //console.log('mousedown fired. clientX: ' + e.clientX + ', clientY: ' + e.clientY + ', screenX: ' + e.screenX + ', screenY: ' + e.screenY);

    let offSetX = this.props.containerOffsetX;
    let offSetY = this.props.containerOffsetY;

    let annotation = {
      content: '',
      timeStamp: Date.now(),
      type: this.state.mode,
      drawing: true,
      x1: e.clientX + offSetX / this.state.scale,
      y1: e.clientY + offSetY / this.state.scale,
      x2: e.clientX + offSetX / this.state.scale,
      y2: e.clientY + offSetY / this.state.scale,
    };

    this.setState({
      pendingAnnotation: annotation,
    });
  },

  handleMouseMove(e) {
     e.stopPropagation();

    //console.log('mousemove fired. clientX: ' + e.clientX + ', clientY: ' + e.clientY + ', screenX: ' + e.screenX + ', screenY: ' + e.screenY);

    if (this.state.visibleViewerId
      || this.state.mode === 'marker'
      || !this.state.pendingAnnotation) return;

    // If drawing is not true, then don't proceed
    if (!this.state.pendingAnnotation.drawing) return;

    let offSetX = this.props.containerOffsetX;
    let offSetY = this.props.containerOffsetY;

    let annotation = this.state.pendingAnnotation;
    annotation.x2 = e.clientX + offSetX / this.state.scale;
    annotation.y2 = e.clientY + offSetY / this.state.scale;

    this.setState({pendingAnnotation: annotation});
  },

  handleMouseUp(e) {
    e.stopPropagation();

    if (this.state.visibleViewerId
      || this.state.mode === 'marker'
      || !this.state.pendingAnnotation) return;

    // If drawing is false, we have already popped the input dialog
    if (!this.state.pendingAnnotation.drawing) return;

    //console.log('mouseup fired. clientX: ' + e.clientX + ', clientY: ' + e.clientY + ', screenX: ' + e.screenX + ', screenY: ' + e.screenY);

    let annotation = this.state.pendingAnnotation;
    annotation.drawing = false;

    let offSetX = this.props.containerOffsetX;
    let offSetY = this.props.containerOffsetY;
    annotation.x2 = e.clientX + offSetX / this.state.scale;
    annotation.y2 = e.clientY + offSetY / this.state.scale;

    if (annotation.x2 < annotation.x1) {
      let old = annotation.x2;
      annotation.x2 = annotation.x1;
      annotation.x1 = old;
    }

    if (annotation.y2 < annotation.y1) {
      let old = annotation.y2;
      annotation.y2 = annotation.y1;
      annotation.y1 = old;
    }

    // Only save the pending change if the mark is bigger than a single point
    // In this case, vertical or horizontal lines are allowed
    if (Math.abs(annotation.x2 - annotation.x1) < 1
      && Math.abs(annotation.y2 - annotation.y1) < 1) {
      this.setState({pendingAnnotation: null});
    }
    else {
      this.setState({pendingAnnotation: annotation});
    }
  },

  switchMode(mode) {
    //console.log('mode is now: ' + mode);
    this.setState({mode: mode});

    if (this.state.pendingAnnotation) {
      this.cancelAnnotation();
    }
  },

  saveAnnotation(content) {
    let a = this.state.pendingAnnotation;
    a.content = content;
    a.timeStamp = Date.now();

    this.props.onSave(a);
    this.setState({pendingAnnotation: null});
  },

  deleteAnnotation(id) {
    this.props.onDelete(id);
  },

  // If editing, pull the annotation out and put it in pending, force viewer to null
  editAnnotation(id) {
    let annotation = this.props.annotations.find((value) => {
      if (value.Id === id) return true;
      return false;
    });

    this.setState({
      pendingAnnotation: annotation,
      visibleViewerId: null
    });
  },

  cancelAnnotation() {
    // TODO: This delays the close event by 50ms to prevent any other click events from firing
    // Is this gross? I don't even know. Think about it some more and change if it is.
    // Hard to see how to do this without timers or screwing up component isolation
    setTimeout(() => {
      this.setState({pendingAnnotation: null});
    }, 50);
  },

  displayAnnotationViewer(id) {
    if (this.state.pendingAnnotation) return;

    clearTimeout(this.viewerHideTimer);

    this.setState({visibleViewerId: id});
  },

  hideAnnotationViewer(id) {
    clearTimeout(this.viewerHideTimer);

    this.viewerHideTimer = setTimeout(() => {
      this.setState({visibleViewerId: null});
    }, 250);
  },

  render() {
    let pA = this.state.pendingAnnotation;

    let pAnnotationComponent = '';
    if (this.state.pendingAnnotation) {
      pAnnotationComponent = <Annotation id={pA.Id}
        content={pA.content}
        pending={true}
        drawing={pA.drawing}
        saveAnnotation={this.saveAnnotation}
        cancelAnnotation={this.cancelAnnotation}
        deleteAnnotation={this.deleteAnnotation}
        type={pA.type}
        x1={pA.x1 * this.state.scale}
        y1={pA.y1 * this.state.scale}
        x2={pA.x2 * this.state.scale}
        y2={pA.y2 * this.state.scale} />;
    }

    // Sorting the annotations: largest area to smallest area, then highlights, then markers
    // This allows us to assign a priority with biggest shapes being lowest in order to
    // calculate a z-index that stacks them accordingly
    let sortedAnnotations = this.props.annotations.sort((m1, m2) => {
      if (m1.type === 'marker' || m2.type === 'marker') {
        if (m1.type === m2.type) return 0;
        if (m1.type === 'marker') return 1;
        return -1;
      }

      if (m1.type === 'highlight' || m2.type === 'highlight') {
        if (m1.type === m2.type) return 0;
        if (m1.type === 'highlight') return 1;
        return -1;
      }

      let m1Area = Math.abs((m1.x1 - m1.x2) * (m1.y1 - m1.y2));
      let m2Area = Math.abs((m2.x1 - m2.x2) * (m2.y1 - m2.y2));

      return m2Area - m1Area;
    });

    let annotations = sortedAnnotations.map((m, i) => {
      return (
        <Annotation key={m.Id}
          id={m.Id}
          priority={i + 1}
          content={m.content}
          timeStamp={m.timeStamp}
          pending={false}
          shouldDisplayViewer={m.Id === this.state.visibleViewerId}
          displayAnnotationViewer={this.displayAnnotationViewer}
          hideAnnotationViewer={this.hideAnnotationViewer}
          deleteAnnotation={this.deleteAnnotation}
          editAnnotation={this.editAnnotation}
          type={m.type}
          x1={m.x1 * this.state.scale}
          y1={m.y1 * this.state.scale}
          x2={m.x2 * this.state.scale}
          y2={m.y2 * this.state.scale} />
      );
    });

    return (
      <div className='cd-container'
        onClick={this.handleClick}
        onMouseDown={this.handleMouseDown}
        onMouseUp={this.handleMouseUp}
        onMouseMove={this.handleMouseMove}
        >
        <ModeToggle mode={this.state.mode} switchMode={this.switchMode} />
        {annotations}
        {pAnnotationComponent}
      </div>
    );
  }
});

module.exports  = Container;
