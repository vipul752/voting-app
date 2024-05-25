const express = require('express');
const router = express.Router();
const Candidate = require('./../models/candidates');
const {jwtAuthMiddleware, generateToken} = require('./../jwt');
const User = require('./../models/user');

const checkAdminRole= async(userID)=>{
    try {
        const user = await User.findById(userID);
        return user.role === "admin";
    } catch (error) {
        return false;
    }
}

// POST route to add a candidate
router.post('/',jwtAuthMiddleware, async (req, res) =>{
    try{
        if(! await checkAdminRole(req.user.id)){
            return res.status(401).json({error: 'user not admin role'});
        }
        const data = req.body // Assuming the request body contains the User data

        // Create a new User document using the Mongoose model
        const newCandidate = new Candidate(data);

        // Save the new user to the database
        const response = await newCandidate.save();
        console.log('data saved');

        const payload = {
            id: response.id
        }
        console.log(JSON.stringify(payload));
        const token = generateToken(payload);

        res.status(200).json({response: response});
    }
    catch(err){
        console.log(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
})



router.put('/:candidateId', jwtAuthMiddleware, async (req, res) => {
    try {
        if(!checkAdminRole(req.user.id)){
            return res.status(401).json({error: 'user not admin role'});
        }

        const candidateId = req.params.candidateId; //take candidate id from params
        const updatedCandidateData = req.body; //take new creditial from vbody

        const response = await Candidate.findByIdAndUpdate(candidateId,updatedCandidateData,{
            new: true,
            runValidators: true
        }) //update the new credential with old date based on id..


        if(!response){
            return res.status(404).json({error: 'Candidate not found'});
        }
        //if candidate id yaha any error faced the give me a error

        console.log('updated candidate data');
        res.status(200).json({response: response});

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.delete('/delete', jwtAuthMiddleware, async (req, res) => {
    try {
        if(!checkAdminRole(req.user.id)){
            return res.status(401).json({error: 'user not aadmoin role'});
        }

        const candidateId = req.body.candidateId; //take candidate id from params

        const response = await Candidate.findByIdAndDelete(candidateId) //delete the candidate date based on id..


        if(!response){
            return res.status(404).json({error: 'Candidate not found'});
        }
        //if candidate id yaha any error faced the give me a error

        
        console.log('candidate deleted');
        res.status(200).json({response: response});

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


//voting

router.post('/vote/:candidateID', jwtAuthMiddleware, async (req, res)=>{
    // no admin can vote
    // user can only vote once
    
    candidateID = req.params.candidateID;
    userId = req.user.id;

    try{
        // Find the Candidate document with the specified candidateID
        const candidate = await Candidate.findById(candidateID);
        if(!candidate){
            return res.status(404).json({ message: 'Candidate not found' });
        }

        const user = await User.findById(userId);
        if(!user){
            return res.status(404).json({ message: 'user not found' });
        }
        if(user.role == 'admin'){
            return res.status(403).json({ message: 'admin is not allowed'});
        }
        if(user.isVoted){
            return res.status(400).json({ message: 'You have already voted' });
        }

        // Update the Candidate document to record the vote
        candidate.votes.push({user: userId})
        candidate.voteCount++;
        await candidate.save();

        // update the user document
        user.isVoted = true
        await user.save();

        return res.status(200).json({ message: 'Vote recorded successfully' });
    }catch(err){
        console.log(err);
        return res.status(500).json({error: 'Internal Server Error'});
    }
});
//vote count
router.get('/vote/count', async (req, res) => {
    try{
        // Find all candidates and sort them by voteCount in descending order
        const candidate = await Candidate.find().sort({voteCount: 'desc'});

        // Map the candidates to only return their name and voteCount
        const voteRecord = candidate.map((data)=>{
            return {
                party: data.party,
                count: data.voteCount
            }
        });

        return res.status(200).json(voteRecord);
    }catch(err){
        console.log(err);
        res.status(500).json({error: 'Internal Server Error'});
    }
});

router.get('/candidateList', async (req, res) => {
    try {
        // Find all candidates and select only the name and party fields, excluding _id
        const candidates = await Candidate.find({}, 'name party -_id');

        // Return the list of candidates
        res.status(200).json(candidates);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
module.exports = router;