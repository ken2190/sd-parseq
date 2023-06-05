import { Alert, Box, Checkbox, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel, MenuItem, Tooltip, Typography } from "@mui/material";
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Unstable_Grid2';
import { Stack } from '@mui/system';
import { Timeline, TimelineEffect, TimelineRow } from '@xzdarcy/react-timeline-editor';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import StyledSwitch from './StyledSwitch';
import { AdvancedParseqPrompts, ParseqPrompts, OverlapType, AdvancedParseqPrompt } from "../ParseqUI";
import _ from 'lodash';

interface PromptsProps {
    initialPrompts: AdvancedParseqPrompts,
    lastFrame: number,
    markDirty: (active:boolean) => void,
    commitChange: (event: any) => void
}

export function convertPrompts(oldPrompts : ParseqPrompts, lastFrame : number) : AdvancedParseqPrompts {
    if (!oldPrompts) {
        return [{
            name: 'Prompt 1',
            positive: "",
            negative: "",
            allFrames: true,
            from: 0,
            to: lastFrame,
            overlap: {
                inFrames: 0,
                outFrames: 0,
                type: "none",
                custom: "prompt_weight_1",
            }
        }]
    } else if (!Array.isArray(oldPrompts)) {
        return [{
            name: 'Prompt 1',
            positive: oldPrompts.positive,
            negative: oldPrompts.negative,
            allFrames: true,
            from: 0,
            to: lastFrame,
            overlap: {
                inFrames: 0,
                outFrames: 0,
                type: "none",
                custom: "prompt_weight_1",
            }
        }]
    } else {
        return oldPrompts as AdvancedParseqPrompts;
    }

}

export function Prompts(props: PromptsProps) {

    //const [prompts, setPrompts] = useState<AdvancedParseqPrompts>(props.initialPrompts);
    const [unsavedPrompts, setUnsavedPrompts] = useState<AdvancedParseqPrompts>(_.cloneDeep(props.initialPrompts));
    const [quickPreviewPosition, setQuickPreviewPosition] = useState(0);
    const [quickPreview, setQuickPreview] = useState("");

    // Copy the initial prompts into the unsaved prompts
    // unless  the initial prompts have a marker indicating they have just looped around
    // from a previous update via commitChanges below.
    useEffect(() => {
        if (props.initialPrompts
            // HACK: This is a hack to prevent infinite loops: if the sentinel is set,
            // we know that the prompts were set in this child component so we can ignore the update when
            // they come back through. If the sentinel is not set, the new prompts may be from a document reversion
            // or other change from outside this component.
            // The sentinel must be stripped before any kind of persistence.
            //@ts-ignore
            && !props.initialPrompts[0].sentinel) {
            console.log('resetting prompts...');
            setUnsavedPrompts(_.cloneDeep(props.initialPrompts));
        }
    }, [props.initialPrompts]);


    // Notify the parent that we have unsaved changes if the unsaved prompts are different from the initial prompts
    useEffect(() => props.markDirty(!_.isEqual(props.initialPrompts, unsavedPrompts)),
        [props.markDirty, props.initialPrompts, unsavedPrompts]);    

    // Call the parent's callback on every prompt change
    const commitChanges = useCallback((newPrompts : AdvancedParseqPrompts) => {
        // HACK: This is a hack to prevent infinite loops: if the sentinel is set,
        // we know that the prompts were set in this child component so we can ignore the update when
        // they come back through.
        //@ts-ignore HACK
        newPrompts[0].sentinel = true;

        setUnsavedPrompts(newPrompts);
        props.commitChange(_.cloneDeep(newPrompts));

    }, [props.commitChange]);
  

    const promptInput = useCallback((index: number, positive: boolean) => {

        const posNegStr = positive?'positive':'negative';
        const hasUnsavedChanges = props.initialPrompts[index] && (unsavedPrompts[index][posNegStr] !== props.initialPrompts[index][posNegStr]);

        return <TextField
            multiline
            minRows={2}
            maxRows={16}
            fullWidth={true}
            style={{ paddingRight: '20px' }}
            label={(positive ? "Positive" : "Negative") + " " + unsavedPrompts[index]?.name?.toLowerCase()}
            value={unsavedPrompts[index][posNegStr]}
            InputProps={{
                style: { fontSize: '0.7em', fontFamily: 'Monospace', color: positive ? 'DarkGreen' : 'Firebrick' },
                sx: { background: hasUnsavedChanges ? 'ivory' : '', },
                endAdornment: hasUnsavedChanges ? '🖊️' : ''                
            }}
            onBlur={(e: any) => {
                commitChanges(unsavedPrompts);
            }}
            onKeyDown={(e: any) => {
                if (e.key === 'Enter') {
                    if (e.shiftKey) {
                        setTimeout(() => e.target.blur());
                        e.preventDefault();
                    }
                } else if (e.key === 'Escape') {
                    unsavedPrompts[index][posNegStr] = props.initialPrompts[index][posNegStr];
                    setUnsavedPrompts([...unsavedPrompts]);
                    setTimeout(() => e.target.blur());
                    e.preventDefault();
                }
            }}            
            onChange={(e: any) => {
                unsavedPrompts[index][posNegStr] = e.target.value;
                setUnsavedPrompts([...unsavedPrompts]);
            }}
            InputLabelProps={{ shrink: true, style: { fontSize: '0.9em' } }}
            size="small"
            variant="outlined" />
    }, [commitChanges, props, unsavedPrompts]);

    const addPrompt = useCallback(() => {
        const newIndex = unsavedPrompts.length;
        let nameNumber = newIndex + 1;
        //eslint-disable-next-line no-loop-func
        while (unsavedPrompts.some(unsavedPrompts => prompt.name === 'Prompt ' + nameNumber)) {
            nameNumber++;
        }

        const newPrompts = [
            ...unsavedPrompts,
            {
                positive: "",
                negative: "",
                from: Math.min(props.lastFrame, unsavedPrompts[newIndex - 1].to + 1),
                to: Math.min(props.lastFrame, unsavedPrompts[newIndex - 1].to + 50),
                allFrames: false,
                name: 'Prompt ' + nameNumber,
                overlap: {
                    inFrames: 0,
                    outFrames: 0,
                    type: "none" as const,
                    custom: "prompt_weight_" + nameNumber,
                }
            }
        ];
        commitChanges(newPrompts);
    }, [unsavedPrompts, props.lastFrame, commitChanges]);

    const delPrompt = useCallback((idxToDelete: number) => {
        const newPrompts = unsavedPrompts.filter((_, idx) => idx !== idxToDelete);
        commitChanges(newPrompts);
    }, [unsavedPrompts, commitChanges]);


    const composableDiffusionWarning = useCallback((idx: number) => {
        const prompt = unsavedPrompts[idx];
        const overlappingPrompts = unsavedPrompts.filter(p => p !== prompt
            && p.from <= prompt.to
            && prompt.from <= p.to);

        if (overlappingPrompts.length > 0
            && (prompt.positive.match(/\sAND\s/)
                || prompt.negative.match(/\sAND\s/))) {
            return <Alert severity="warning">
                Warning: Parseq uses <a href="https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Features#composable-diffusion">composable diffusion</a> to combine overlapping prompts.
                &nbsp;{prompt.name} overlaps with the following: <strong>{overlappingPrompts.map(p => p.name).join(', ')}</strong>.
                But {prompt.name}  also appears to contain its own composable diffusion sections (<span style={{ fontFamily: 'monospace' }}>&#8230; AND &#8230;</span>).
                This may lead to unexpected results. Check your rendered prompts in the preview window and consider removing the composable diffusion sections  from {prompt.name} if possible.
            </Alert>
        }
        return <></>;
    }, [unsavedPrompts]);


    const displayFadeOptions = useCallback((promptIdx: number) => {
        const prompt = unsavedPrompts[promptIdx];
        
        return <>
            <Tooltip arrow placement="top" title="Specify how this prompt will be weighted if it overlaps with other prompts.">
                <TextField
                    select
                    fullWidth={false}
                    size="small"
                    style={{ width: '7em', marginLeft: '5px' }}
                    label={"Overlap weight: "}
                    InputLabelProps={{ shrink: true, }}
                    InputProps={{ style: { fontSize: '0.75em' } }}
                    value={prompt.overlap.type}
                    onChange={(e: any) => {
                        unsavedPrompts[promptIdx].overlap.type = (e.target.value as OverlapType);
                        commitChanges([...unsavedPrompts]);
                    }}
                >
                    <MenuItem value={"none"}>Fixed</MenuItem>
                    <MenuItem value={"linear"}>Linear fade </MenuItem>
                    <MenuItem value={"custom"}>Custom</MenuItem>
                </TextField>
            </Tooltip>
            <Tooltip arrow placement="top" title="Length of fade-in (frames).">
                <TextField
                    type="number"
                    size="small"
                    style={{ paddingBottom: '0px', width: '5em', display: prompt.overlap.type !== "linear" ? "none" : "" }}
                    label={"In"}
                    disabled={prompt.overlap.type === "none"}
                    inputProps={{
                        style: { fontFamily: 'Monospace', fontSize: '0.75em' },
                        sx: { background: unsavedPrompts[promptIdx].overlap.inFrames !== props.initialPrompts[promptIdx]?.overlap?.inFrames ? 'ivory' : '', },
                    }}
                    InputLabelProps={{ shrink: true, }}
                    value={prompt.overlap.inFrames}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) {
                            unsavedPrompts[promptIdx].overlap.inFrames = val;
                            setUnsavedPrompts([...unsavedPrompts]);
                        }
                    }}
                    onBlur={(e) => {
                        if (parseInt(e.target.value) > (unsavedPrompts[promptIdx].to - unsavedPrompts[promptIdx].from)) {
                            unsavedPrompts[promptIdx].overlap.inFrames = (unsavedPrompts[promptIdx].to - unsavedPrompts[promptIdx].from);
                        }
                        if (parseInt(e.target.value) < 0) {
                            unsavedPrompts[promptIdx].overlap.inFrames = 0;
                        }
                        commitChanges([...unsavedPrompts]);
                    }}
                    onKeyDown={(e: any) => {
                        if (e.key === 'Enter') {
                            setTimeout(() => e.target.blur());
                            e.preventDefault();
                        } else if (e.key === 'Escape') {
                            unsavedPrompts[promptIdx].overlap.inFrames = props.initialPrompts[promptIdx]?.overlap?.inFrames;
                            setUnsavedPrompts([...unsavedPrompts]);
                            setTimeout(() => e.target.blur());
                            e.preventDefault();
                        }
                    }}
                />
            </Tooltip>
            <Tooltip arrow placement="top" title="Length of fade-out (frames)">
                <TextField
                    type="number"
                    size="small"
                    style={{ paddingBottom: '0px', width: '5em', display: prompt.overlap.type !== "linear" ? "none" : "" }}
                    label={"Out"}
                    disabled={prompt.overlap.type === "none"}
                    inputProps={{
                        style: { fontFamily: 'Monospace', fontSize: '0.75em' },
                        sx: { background: unsavedPrompts[promptIdx].overlap.outFrames !== props.initialPrompts[promptIdx]?.overlap?.outFrames ? 'ivory' : '', },
                    }}
                    InputLabelProps={{ shrink: true, }}
                    value={prompt.overlap.outFrames}
                    onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value)) {
                            unsavedPrompts[promptIdx].overlap.outFrames = value;
                            setUnsavedPrompts([...unsavedPrompts]);
                        }
                    }}
                    onBlur={(e) => {
                        const value = parseInt(e.target.value);
                        if (value > (unsavedPrompts[promptIdx].to - unsavedPrompts[promptIdx].from)) {
                            unsavedPrompts[promptIdx].overlap.outFrames = (unsavedPrompts[promptIdx].to - unsavedPrompts[promptIdx].from);
                        } else if (value < 0) {
                            unsavedPrompts[promptIdx].overlap.outFrames = 0;
                        } else if (isNaN(value)) {
                            unsavedPrompts[promptIdx].overlap.outFrames = props.initialPrompts[promptIdx].overlap.outFrames;
                        }
                        commitChanges([...unsavedPrompts]);
                    }}
                    onKeyDown={(e: any) => {
                        if (e.key === 'Enter') {
                            setTimeout(() => e.target.blur());
                            e.preventDefault();
                        } else if (e.key === 'Escape') {
                            unsavedPrompts[promptIdx].overlap.outFrames = props.initialPrompts[promptIdx].overlap.outFrames;
                            setUnsavedPrompts([...unsavedPrompts]);
                            setTimeout(() => e.target.blur());
                            e.preventDefault();
                        }
                    }}
                />
            </Tooltip>
            <Tooltip arrow placement="top" title="If fade mode is custom, the weight during the fade will be the result of the parseq formula you specify here.">
                <TextField
                    type="string"
                    size="small"
                    style={{ marginLeft: '10px', display: prompt.overlap.type !== "custom" ? "none" : "" }}
                    label={"Custom formula"}
                    disabled={prompt.overlap.type !== "custom"}
                    inputProps={{
                        style: { fontFamily: 'Monospace', fontSize: '0.75em' },
                        sx: { background: unsavedPrompts[promptIdx].overlap.custom !== props.initialPrompts[promptIdx]?.overlap?.custom ? 'ivory' : '', },
                    }}
                    InputLabelProps={{ shrink: true, }}
                    value={prompt.overlap.custom}
                    onChange={(e) => {
                        unsavedPrompts[promptIdx].overlap.custom = e.target.value;
                        setUnsavedPrompts([...unsavedPrompts]);
                    }}
                    onBlur={(e) => {
                        commitChanges([...unsavedPrompts]);
                    }}
                    onKeyDown={(e: any) => {
                        if (e.key === 'Enter') {
                            setTimeout(() => e.target.blur());
                            e.preventDefault();
                        } else if (e.key === 'Escape') {
                            unsavedPrompts[promptIdx].overlap.custom = props.initialPrompts[promptIdx].overlap.custom;
                            setUnsavedPrompts([...unsavedPrompts]);
                            setTimeout(() => e.target.blur());
                            e.preventDefault();
                        }
                    }}                      

                />
            </Tooltip>
        </>
    }, [unsavedPrompts, commitChanges, props]);


    const displayPrompts = useCallback((advancedPrompts: AdvancedParseqPrompts) =>
        <Grid container xs={12}  sx = {{ paddingTop:'0',paddingBottom:'0'}}>
            {
                advancedPrompts.map((prompt, idx) =>
                    <Box key={"prompt-" + idx} sx={{ width: '100%', padding: 0, marginTop: 2, marginRight: 2, border: 0, backgroundColor: 'rgb(250, 249, 246)', borderRadius: 1 }} >
                        <Grid xs={12} style={{ padding: 0, margin: 0, border: 0 }}>

                            <Box sx={{ display: 'flex', justifyContent: 'left', alignItems: 'center', width: '100%' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'left', alignItems: 'center', width: '75%' }}>
                                    <h5>{prompt.name} –</h5>
                                    <Tooltip arrow placement="top" title="Make this prompt active for the whole animation">
                                        <FormControlLabel
                                            style={{ fontSize: '0.75em', paddingLeft: '10px' }}
                                            control={
                                                <Checkbox
                                                    checked={prompt.allFrames}
                                                    onChange={(e) => {
                                                        unsavedPrompts[idx].allFrames = e.target.checked;
                                                        commitChanges([...unsavedPrompts]);
                                                    }}
                                                    size='small' />
                                            } label={<Box component="div" fontSize="0.75em">All frames OR</Box>} />
                                    </Tooltip>
                                    <Tooltip arrow placement="top" title="Frame number where this prompt begins">
                                        <TextField
                                            type="number"
                                            size="small"
                                            style={{ paddingBottom: '0px', width: '5em' }}
                                            id={"from" + (idx + 1)}
                                            label={"From"}
                                            disabled={prompt.allFrames}
                                            inputProps={{
                                                style: { fontFamily: 'Monospace', fontSize: '0.75em' },
                                                sx: { background: unsavedPrompts[idx].from !== props.initialPrompts[idx]?.from ? 'ivory' : '', },
                                            }}
                                            InputLabelProps={{ shrink: true, }}
                                            value={prompt.from}
                                            onChange={(e) => {
                                                const value = parseInt(e.target.value);
                                                if (!isNaN(value)) {
                                                    unsavedPrompts[idx].from = value;
                                                    setUnsavedPrompts([...unsavedPrompts]);
                                                }
                                            }}
                                            onBlur={(e) => {
                                                const value = parseInt(e.target.value);
                                                if (value >= unsavedPrompts[idx].to) {
                                                    unsavedPrompts[idx].from = unsavedPrompts[idx].to;
                                                }
                                                commitChanges([...unsavedPrompts]);
                                            }}
                                            onKeyDown={(e: any) => {
                                                if (e.key === 'Enter') {
                                                    setTimeout(() => e.target.blur());
                                                    e.preventDefault();
                                                } else if (e.key === 'Escape') {
                                                    unsavedPrompts[idx].from = props.initialPrompts[idx].from;
                                                    setUnsavedPrompts([...unsavedPrompts]);
                                                    setTimeout(() => e.target.blur());
                                                    e.preventDefault();
                                                }
                                            }}
                                        />
                                    </Tooltip>
                                    <Tooltip arrow placement="top" title="Frame number where this prompt ends">
                                        <TextField
                                            type="number"
                                            size="small"
                                            style={{ paddingBottom: '0px', width: '5em' }}
                                            id={"to" + (idx + 1)}
                                            label={"To"}
                                            disabled={prompt.allFrames}
                                            inputProps={{
                                                style: { fontFamily: 'Monospace', fontSize: '0.75em' },
                                                sx: { background: unsavedPrompts[idx].to !== props.initialPrompts[idx]?.to ? 'ivory' : '', },
                                            }}
                                            InputLabelProps={{ shrink: true, }}
                                            value={prompt.to}
                                            onChange={(e) => {
                                                const value = parseInt(e.target.value);
                                                if (!isNaN(value)) {
                                                    unsavedPrompts[idx].to = value;
                                                    setUnsavedPrompts([...unsavedPrompts]);
                                                }
                                            }}
                                            onBlur={(e) => {
                                                const value = parseInt(e.target.value);
                                                if (value <= unsavedPrompts[idx].from) {
                                                    unsavedPrompts[idx].to = unsavedPrompts[idx].from;
                                                } else if (value >= props.lastFrame) {
                                                    unsavedPrompts[idx].to = props.lastFrame;
                                                }
                                                commitChanges([...unsavedPrompts]);
                                            }}
                                            onKeyDown={(e: any) => {
                                                if (e.key === 'Enter') {
                                                    setTimeout(() => e.target.blur());
                                                    e.preventDefault();
                                                } else if (e.key === 'Escape') {
                                                    unsavedPrompts[idx].to = props.initialPrompts[idx].to;
                                                    setUnsavedPrompts([...unsavedPrompts]);
                                                    setTimeout(() => e.target.blur());
                                                    e.preventDefault();
                                                }
                                            }}
                                        />
                                    </Tooltip>
                                    {displayFadeOptions(idx)}
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'right', alignItems: 'center', paddingRight: '15px', width: '25%' }}>
                                    <Button
                                        disabled={unsavedPrompts.length < 2}
                                        size="small"
                                        variant="outlined"
                                        color='warning'
                                        style={{ marginLeft: '40px', float: 'right', fontSize: '0.75em' }}
                                        onClick={(e) => delPrompt(idx)}>
                                        ❌ Delete prompt
                                    </Button>
                                </Box>
                            </Box>
                        </Grid>
                        <Grid container xs={12} style={{ margin: 0, padding: 0 }}>
                            <Grid xs={6} style={{ margin: 0, padding: 0 }}>
                                {promptInput(idx, true)}
                            </Grid>
                            <Grid xs={6} style={{ margin: 0, padding: 0 }}>
                                {promptInput(idx, false)}
                            </Grid>
                            <Grid xs={12}>
                                {composableDiffusionWarning(idx)}
                            </Grid>
                        </Grid>
                    </Box>)
            }
        </Grid>
        , [delPrompt, promptInput, unsavedPrompts, props, displayFadeOptions, composableDiffusionWarning, commitChanges]);

    const [openSpacePromptsDialog, setOpenSpacePromptsDialog] = useState(false);
    const [spacePromptsLastFrame, setSpacePromptsLastFrame] = useState(props.lastFrame);
    const [spacePromptsOverlap, setSpacePromptsOverlap] = useState(0);

    // TODO: Not sure why this is necessary, but without it, spacePromptsLastFrame doesn't update when new props are passed in.
    // I thought it would always re-evaluate.
    useEffect(() => {
        setSpacePromptsLastFrame(props.lastFrame);
    }, [props.lastFrame]);  

    const handleCloseSpacePromptsDialog = useCallback((e: any): void => {
        setOpenSpacePromptsDialog(false);        
        if (e.target.id !== "space") {
            return;
        }

        const span = (spacePromptsLastFrame + 1) / unsavedPrompts.length;
        const newPrompts = unsavedPrompts.map((p, idx) => {
            const newPrompt = { ...p };
            newPrompt.from = Math.max(0, Math.ceil(idx * span - spacePromptsOverlap / 2));
            newPrompt.to = Math.min(props.lastFrame, Math.floor((idx + 1) * span + spacePromptsOverlap / 2));
            newPrompt.allFrames = false;
            newPrompt.overlap.type = spacePromptsOverlap > 0 ? 'linear' : 'none';
            newPrompt.overlap.inFrames = newPrompt.from <= 0 ? 0 : spacePromptsOverlap;
            newPrompt.overlap.outFrames = newPrompt.to >= props.lastFrame ? 0 : spacePromptsOverlap;
            return newPrompt;
        });
        commitChanges(newPrompts);

    }, [unsavedPrompts, commitChanges, spacePromptsLastFrame, spacePromptsOverlap, props.lastFrame]);
    const spacePromptsDialog = <Dialog open={openSpacePromptsDialog} onClose={handleCloseSpacePromptsDialog}>
        <DialogTitle>↔️ Evenly space prompts </DialogTitle>
        <DialogContent>
            <DialogContentText>
                Space all {unsavedPrompts.length} prompts evenly across the entire video, with optional fade between prompts.
                <br />

            </DialogContentText>
            <TextField
                type="number"
                size="small"
                style={{ marginTop: '10px', display: 'none' }}
                label={"Last frame"}
                inputProps={{ style: { fontFamily: 'Monospace', fontSize: '0.75em' } }}
                InputLabelProps={{ shrink: true, }}
                value={spacePromptsLastFrame}
                onChange={(e) => { setSpacePromptsLastFrame(parseInt(e.target.value)); }}
            />
            <TextField
                type="number"
                size="small"
                style={{ marginTop: '10px', width: '10em' }}
                label={"Fade frames"}
                inputProps={{ style: { fontFamily: 'Monospace', fontSize: '0.75em' } }}
                InputLabelProps={{ shrink: true, }}
                value={spacePromptsOverlap}
                onChange={(e) => { setSpacePromptsOverlap(parseInt(e.target.value)); }}
            />
            <Typography><small>This will overwrite the "From", "To" and "Fade" fields of all prompts.</small></Typography>
        </DialogContent>
        <DialogActions>
            <Button size="small" id="cancel_space" onClick={handleCloseSpacePromptsDialog}>Cancel</Button>
            <Button size="small" variant="contained" id="space" onClick={handleCloseSpacePromptsDialog}>↔️ Space</Button>
        </DialogActions>
    </Dialog>

    const [timelineWidth, setTimelineWidth] = useState(600);
    const timelineRef = useRef<any>(null);
    const timeline = useMemo(() => {
        const data: TimelineRow[] = unsavedPrompts.map((p, idx) => ({
            id: idx.toString(),
            actions: [
                {
                    id: p.name,
                    start: p.allFrames ? 0 : p.from,
                    end: p.allFrames ? props.lastFrame : p.to,
                    effectId: "effect0",
                },
            ],

        }));

        const effects: Record<string, TimelineEffect> = {
            effect0: {
                id: "effect0",
                name: "Zero",
            },
            effect1: {
                id: "effect1",
                name: "One",
            },
        };

        // scale to 1/25th of frame length and round to nearest 5 
        const scale = Math.ceil(props.lastFrame / 25 / 5) * 5;
        const scaleWidth = timelineWidth / ((props.lastFrame * 1.1) / scale);
        //console.log("re-rendering with", timelineWidth, scale, scaleWidth);

        return (
            <span ref={timelineRef}>
                <Timeline
                    style={{ height: (50 + Math.min(unsavedPrompts.length, 4) * 25) + 'px', width: '100%' }}
                    editorData={data}
                    effects={effects}
                    scale={scale}
                    scaleWidth={scaleWidth}
                    rowHeight={15}
                    gridSnap={true}
                    onChange={(e: any) => {
                        const newPrompts = unsavedPrompts.map((p, idx) => {
                            const action = e[idx].actions.find((a: any) => a.id === p.name);
                            p.from = Math.round(action.start);
                            p.to = Math.round(action.end);
                            return p;
                        });
                        commitChanges(newPrompts);
                    }}
                    getActionRender={(action: any, row: any) => {
                        return <div style={{ borderRadius: '5px', marginTop: '1px', overflow: 'hidden', maxHeight: '15px', backgroundColor: 'rgba(125,125,250,0.5)' }}>
                            <Typography paddingLeft={'5px'} color={'white'} fontSize='0.7em'>
                                {`${action.id}: ${action.start.toFixed(0)}-${action.end.toFixed(0)}`}
                            </Typography>
                        </div>
                    }}
                    getScaleRender={(scale: number) => scale < props.lastFrame ?
                        <Typography fontSize={'0.75em'}>{scale}</Typography>
                        : scale === props.lastFrame ?
                            <Typography fontSize={'0.75em'} color='orange'>{scale}</Typography>
                            : <Typography fontSize={'0.75em'} color='red'>{scale}</Typography>}
                    onCursorDrag={(e: any) => {
                        setQuickPreviewPosition(Math.round(e));
                    }}
                    onClickTimeArea={(time: number, e: any): boolean => {
                        setQuickPreviewPosition(Math.round(time));
                        return true;
                    }}
                />
            </span>
        );

    }, [commitChanges, unsavedPrompts, props, timelineWidth]);

    useEffect((): any => {
        function handleResize() {
            if (timelineRef.current) {
                setTimelineWidth(timelineRef.current.offsetWidth);
            }
            //console.log("resized to", timelineRef.current.offsetWidth);
        }
        handleResize();
        window.addEventListener('resize', handleResize)
        return (_: any) => window.removeEventListener('resize', handleResize);
    }, []);

    // update the quick preview when the cursor is dragged or prompts change
    useEffect(() => {
        const f = quickPreviewPosition;
        const activePrompts = unsavedPrompts
            .filter(p => p.allFrames || (f >= p.from && f <= p.to));

        let preview = '';
        if (activePrompts.length === 0) {
            preview = '⚠️ No prompt';
        } else if (activePrompts.length === 1) {
            preview = activePrompts[0].name.replace(' ', '_');
        } else {
            preview = activePrompts
                .map(p => `${p.name.replace(' ', '_')} : ${calculateWeight(p, f, props.lastFrame)}`)
                .join(' AND ');
        }

        setQuickPreview(preview);
    }, [unsavedPrompts, quickPreviewPosition, props.lastFrame]);

    return <Grid xs={12} container style={{ margin: 0, padding: 0 }}>
        <Grid xs={12} sx = {{ paddingTop:'0',paddingBottom:'0'}}>
            <FormControlLabel
                sx = {{ padding:'0' }}
                control={<StyledSwitch                    
                    onChange={(e) => { setPromptsEnabled(e.target.checked) }}
                    checked={isPromptsEnabled()} />}
                label={<small> Use Parseq to manage prompts (disable to control prompts with Deforum instead).</small>} />
        </Grid>
        {isPromptsEnabled() ? <>
            {displayPrompts(unsavedPrompts)}
            {spacePromptsDialog}        
            <Grid xs={12}sx={{ paddingTop: '15px', paddingBottom: '15px'  }}  >
                <Button size="small" variant="outlined" style={{ marginRight: 10 }} onClick={addPrompt}>➕ Add prompts</Button>
                <Button size="small" disabled={unsavedPrompts.length < 2} variant="outlined" style={{ marginRight: 10 }} onClick={() => setOpenSpacePromptsDialog(true)}>↔️ Evenly space prompts</Button>
            </Grid>
            <Grid xs={4} sx={{ paddingRight: '15px'}} >
                <Tooltip title="Quickly see which prompts will be used at each frame, and whether they will be composed. To see the full rendered prompts, use the main preview below." >
                    <Stack>
                        <TextField
                            multiline
                            minRows={2}
                            maxRows={16}
                            size="small"
                            fullWidth={true}
                            InputLabelProps={{ shrink: true }}
                            InputProps={{ readOnly: true, style: { fontFamily: 'Monospace', fontSize: '0.75em', background: 'whitesmoke' } }}
                            value={quickPreview}
                            label={`Quick preview [frame ${quickPreviewPosition}]`}
                            variant="outlined"
                        />
                    </Stack>
                </Tooltip>
            </Grid>
            <Grid xs={8}>
                {timeline}
            </Grid>
        </> : <></>
        }
    </Grid>

    // HACK: this should really be a top-level field on the AdvancedPrompts type,
    // but there's a lot of code that relies on that being an array type.
    // So we make it a field of AdvancedPrompt (singular) and check the first prompt instead...
    function setPromptsEnabled(enabled:boolean) {
        commitChanges(unsavedPrompts.map(p => ({
            ...p,
            enabled: enabled
        })));
    }
    function isPromptsEnabled(): boolean {
        return typeof (unsavedPrompts[0].enabled) === 'undefined' || unsavedPrompts[0].enabled;
    }
}


export function calculateWeight(p: AdvancedParseqPrompt, f: number, lastFrame: number) {

    switch (p.overlap.type) {
        case "linear":
            const promptStart = p.allFrames ? 0 : p.from;
            const promptEnd = p.allFrames ? lastFrame : p.to;
            if (p.overlap.inFrames && f < (promptStart + p.overlap.inFrames)) {
                const fadeOffset = f - promptStart;
                const fadeRatio = fadeOffset / p.overlap.inFrames;
                return fadeRatio.toPrecision(4);
            } else if (p.overlap.outFrames && f > (promptEnd - p.overlap.outFrames)) {
                const fadeOffset = f - (promptEnd - p.overlap.outFrames);
                const fadeRatio = fadeOffset / p.overlap.outFrames;
                return (1 - fadeRatio).toPrecision(4);
            } else {
                return '1';
            }
        case "custom":
            return "${" + p.overlap.custom + "}";
        default:
            return '1';
    }

}



