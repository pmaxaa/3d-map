import { useState } from "react";
import { FormGroup, FormControlLabel, FormLabel, Checkbox, Drawer, Button, Box, RadioGroup, Radio } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { ThemeProvider } from "@mui/system";
import {colors} from './constants.js';

import theme from './theme.js';


export default function Custom({filters, setFilters, style, changeStyle, changeBuildingsColor}){

    const [open, setOpen] = useState(false);

    const showDrawer = () => {
        setOpen(true);
    };
    
    const onClose = () => {
        setOpen(false);
    };

    const handleCheckBox = (e, name) => {
        setFilters(
            {
                ...filters,
                [name]: e.target.checked,
            }
        );
    }

    const handleButtons = (e) => {
        changeBuildingsColor(e.target.style['background-color']);
    }

    const handleRadioGroup = (e) => {
        changeStyle(e.target.value);
    }

    return(
        <ThemeProvider theme={theme}>
            <Button size="large" type="secondary" variant="contained" onMouseOver={showDrawer}  sx={{display: "flex"}}>
                <TuneIcon/>
            </Button>
            <Drawer anchor="right" onClose={onClose} open={open}>
                <Box sx={{ width : "250px", height: "fit-content", padding: "20px"}} onMouseOver={showDrawer} onMouseOut={onClose}>
                    <FormGroup sx={{margin: "20px 0"}}>
                    <FormLabel>Показать: </FormLabel>
                        <FormControlLabel control={<Checkbox checked={filters.corps} color="secondary" onChange={(e) => handleCheckBox(e, "corps")}/>} label="Учебные корпуса" />
                        <FormControlLabel control={<Checkbox checked={filters.dorms} color="secondary" onChange={(e) => handleCheckBox(e, "dorms")}/>} label="Общежития" />
                        <FormControlLabel control={<Checkbox checked={filters.others} color="secondary" onChange={(e) => handleCheckBox(e, "others")}/>} label="Другие" />
                    </FormGroup>
                    <FormGroup sx={{marginBottom: "20px"}}>
                        <FormLabel>Стиль карты</FormLabel>
                        <RadioGroup
                            value = {style}
                            name="radio-buttons-group"
                            onChange={handleRadioGroup}
                        >
                            <FormControlLabel value="streets-v12" control={<Radio />} label="Обычная" />
                            <FormControlLabel value="dark-v11" control={<Radio />} label="Темная" />
                            <FormControlLabel value="light-v11" control={<Radio />} label="Светлая " />
                        </RadioGroup>
                    </FormGroup>
                    <FormGroup>
                        <FormLabel>Цвет зданий</FormLabel>
                        <div className="colorPicker">
                            {colors.map((color) => (
                                <div className="buttonDiv">
                                    <button style={{backgroundColor: color}} className="colorButton" onClick={handleButtons}></button>
                                </div>
                            ))}
                        </div>                      
                    </FormGroup>
                </Box>
            </Drawer>
        </ThemeProvider>       
    );
};